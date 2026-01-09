import os
from aws_cdk import (
    Duration,
    Stack,
    aws_lambda as _lambda,
    aws_apigateway as apigw,
    aws_rds as rds,
    aws_ec2 as ec2,
    aws_s3 as s3,
    aws_cognito as cognito,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    RemovalPolicy,
    CfnOutput
    # aws_sqs as sqs,
)
from constructs import Construct
from aws_cdk.aws_lambda_python_alpha import PythonFunction



class InfraStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        # The code that defines your stack goes here

        # Create a VPC
        vpc = ec2.Vpc(self, 'nook-vpc', max_azs=2, nat_gateways=1)

        # Cognito User Pool
        user_pool = cognito.UserPool(
            self, "nook-user-pool",
            user_pool_name="nook-user-pool",
            self_sign_up_enabled=True,
            user_verification=cognito.UserVerificationConfig(
                email_subject="Verify your email for Nook!",
                email_body="Thanks for signing up to Nook! Your verification code is {####}",
                email_style=cognito.VerificationEmailStyle.CODE
            ),
            sign_in_aliases=cognito.SignInAliases(
                email=True
            ),
            auto_verify=cognito.AutoVerifiedAttrs(email=True),
            removal_policy=RemovalPolicy.DESTROY  # For dev/test
        )

        user_pool_client = user_pool.add_client(
            "nook-user-pool-client",
            auth_flows=cognito.AuthFlow(
                user_password=True,
                user_srp=True
            )
        )

        # Creates a Lambda function based on code in /backend
        cafe_lambda = PythonFunction(
            self, "nook-lambda",
            runtime=_lambda.Runtime.PYTHON_3_11,
            entry=os.path.join(os.path.dirname(__file__), "../../backend"),
            index="lambda_handler.py",
            handler="handler",
            vpc=vpc,               # lambda in the same vpc as DB
            timeout=Duration.seconds(30),  # Increase timeout for DB connection
            memory_size=512  # More memory = faster cold starts
        )

        # Creates a REST API that forwards all requests to the Lambda function
        api = apigw.LambdaRestApi(
            self, 'nook-api',
            handler=cafe_lambda,
            proxy=True
        )


        # create a RD postgres instance
        # Create a small Postgres instance in the VPC
        # Generate a secret with DB username + password in Secrets Manager
        # Use private subnets (no public endpoint)
        db_username = 'dbuser'
        db_name = 'nookDB'
        db_instance = rds.DatabaseInstance(
            self,
            'nook-db',
            engine=rds.DatabaseInstanceEngine.postgres(
                version=rds.PostgresEngineVersion.VER_16_3
            ),
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS
            ),
            credentials = rds.Credentials.from_generated_secret(db_username), #The username and password are stored in a Secrets Manager secret
            multi_az = False,
            allocated_storage = 20,
            max_allocated_storage = 100,
            storage_encrypted = True,

            database_name = db_name,
            instance_type = ec2.InstanceType.of(
                ec2.InstanceClass.BURSTABLE3,
                ec2.InstanceSize.MICRO
            ),

            publicly_accessible = False,
            deletion_protection = False,   
        )


        # Allow Lambda to connect to RDS on port 5432
        db_instance.connections.allow_default_port_from(cafe_lambda, "Lambda access to DB" )

        # Migration Lambda
        migration_lambda = PythonFunction(
            self, "nook-migration-lambda",
            runtime=_lambda.Runtime.PYTHON_3_11,
            entry=os.path.join(os.path.dirname(__file__), "../../backend"),
            index="migration_handler.py",
            handler="handler",
            vpc=vpc,
            timeout=Duration.seconds(60),
            memory_size=512
        )

        db_instance.connections.allow_default_port_from(migration_lambda, "Migration Lambda access to DB")
        
        migration_lambda.add_environment("DB_HOST", db_instance.instance_endpoint.hostname)
        migration_lambda.add_environment("DB_NAME", db_name)
        migration_lambda.add_environment("DB_USER", db_username)
        migration_lambda.add_environment("DB_PORT", str(db_instance.instance_endpoint.port))
        
        if db_instance.secret is not None:
            migration_lambda.add_environment("DB_SECRET_ARN", db_instance.secret.secret_arn)
            db_instance.secret.grant_read(migration_lambda)

        # Expose some DB connection info to Lambda via env vars
        cafe_lambda.add_environment("DB_HOST",value=db_instance.instance_endpoint.hostname)
        cafe_lambda.add_environment("DB_NAME",value=db_name)
        cafe_lambda.add_environment("DB_USER", db_username)
        cafe_lambda.add_environment("DB_PORT", str(db_instance.instance_endpoint.port))
        # secret ARN so lambda can fetch password from the secrets manager at the runtime
        if db_instance.secret is not None:
            cafe_lambda.add_environment("DB_SECRET_ARN", db_instance.secret.secret_arn)
            # allow lambda to read the secret
            db_instance.secret.grant_read(cafe_lambda)

        # Cognito Info for Backend if needed
        cafe_lambda.add_environment("USER_POOL_ID", user_pool.user_pool_id)
        cafe_lambda.add_environment("USER_POOL_CLIENT_ID", user_pool_client.user_pool_client_id)

        # create a s3 bucket to store the photos of the cafes
        cafe_photos_bucket = s3.Bucket(
            self,
            "nook-photos-bucket",
            versioned=True,
            removal_policy=RemovalPolicy.DESTROY,
            public_read_access=True,
            block_public_access=s3.BlockPublicAccess(
                block_public_acls=False,
                block_public_policy=False,
                ignore_public_acls=False,
                restrict_public_buckets=False
            ),
            cors=[
                s3.CorsRule(
                    allowed_methods=[s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST, s3.HttpMethods.HEAD],
                    allowed_origins=["http://localhost:3000", "http://localhost:8081", "https://d1qciprdjl1a7f.cloudfront.net", "https://d2bbsr7w8asxtx.cloudfront.net", "https://main.d346k14opurixl.amplifyapp.com", "https://nookstudio.online"],
                    allowed_headers=["*"],
                    max_age=3000
                )
            ]
        )
        # grand lambda permission to write to the s3 bucket
        cafe_photos_bucket.grant_write(cafe_lambda)
        cafe_photos_bucket.grant_read(cafe_lambda)

        cafe_lambda.add_environment("CAFE_PHOTOS_BUCKET", cafe_photos_bucket.bucket_name)

        # Admin Frontend Static Website Hosting
        admin_bucket = s3.Bucket(
            self, "nook-admin-bucket",
            website_index_document="index.html",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=RemovalPolicy.DESTROY
        )

        origin_access_identity = cloudfront.OriginAccessIdentity(self, "nook-oai")
        admin_bucket.grant_read(origin_access_identity)

        distribution = cloudfront.Distribution(
            self, "nook-admin-dist",
            default_root_object="index.html",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3Origin(admin_bucket, origin_access_identity=origin_access_identity),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
            )
        )

        # Outputs
        CfnOutput(self, "nook-api-url", value=api.url)
        CfnOutput(self, "nook-admin-url", value=f"https://{distribution.distribution_domain_name}")
        CfnOutput(self, "nook-user-pool-id", value=user_pool.user_pool_id)
        CfnOutput(self, "nook-user-pool-client-id", value=user_pool_client.user_pool_client_id)


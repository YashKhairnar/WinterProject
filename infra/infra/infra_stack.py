import os
from aws_cdk import (
    Duration,
    Stack,
    aws_lambda as _lambda,
    aws_apigateway as apigw,
    aws_rds as rds,
    aws_ec2 as ec2,
    aws_s3 as s3,
    RemovalPolicy
    # aws_sqs as sqs,
)
from constructs import Construct
from aws_cdk.aws_lambda_python_alpha import PythonFunction



class InfraStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        # The code that defines your stack goes here

        #Create a database instance
        vpc = ec2.Vpc(self, 'simplevpc', max_azs=2, nat_gateways=1)

        #Creates a Lambda function based on code in /backend
        cafe_lambda = PythonFunction(
            self, "cafe_lambda",
            runtime = _lambda.Runtime.PYTHON_3_11,
            entry = os.path.join(os.path.dirname(__file__), "../../backend"),
            index = "lambda_handler.py",
            handler = "handler",
            vpc = vpc,               #lambda in the same vpc as DB
            timeout = Duration.seconds(30),  # Increase timeout for DB connection
            memory_size = 512  # More memory = faster cold starts
            )


        #Creates a REST API that forwards all requests to the Lambda function
        api = apigw.LambdaRestApi(
            self, 'simple-api',
            handler = cafe_lambda,
            proxy = True
        )


        #create a RD postgres instance
        #Create a small Postgres instance in the VPC
        #Generate a secret with DB username + password in Secrets Manager
        #Use private subnets (no public endpoint)
        db_username = 'dbuser'
        db_name = 'winterProjectDB'
        db_instance = rds.DatabaseInstance(
            self,
            'simpleDB',
            engine = rds.DatabaseInstanceEngine.postgres(
                version = rds.PostgresEngineVersion.VER_16_3
            ),
            vpc = vpc,
            vpc_subnets = ec2.SubnetSelection(
                subnet_type = ec2.SubnetType.PRIVATE_WITH_EGRESS
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

        # Expose some DB connection info to Lambda via env vars
        cafe_lambda.add_environment("DB_HOST",value=db_instance.instance_endpoint.hostname)
        cafe_lambda.add_environment("DB_NAME",value=db_name)
        cafe_lambda.add_environment("DB_USER",value=db_username)
        cafe_lambda.add_environment("DB_PORT", value=str(db_instance.instance_endpoint.port))
        #secret ARN so lambda can fetch password from the secrets manager at the runtime
        if db_instance.secret is not None:
            cafe_lambda.add_environment("DB_SECRET_ARN",value=db_instance.secret.secret_arn)
            #allow lambda to read the secret
            db_instance.secret.grant_read(cafe_lambda)


        #create a s3 bucket to store the photos of the cafes
        cafe_photos_bucket = s3.Bucket(
            self, 
            "cafe-photos-bucket", 
            versioned=True, 
            removal_policy=RemovalPolicy.DESTROY,
            public_read_access=True,
            block_public_access=s3.BlockPublicAccess(
                block_public_acls=False,
                block_public_policy=False,
                ignore_public_acls=False,
                restrict_public_buckets=False
            )
        )
        #grand lambda permission to write to the s3 bucket
        cafe_photos_bucket.grant_write(cafe_lambda)
        cafe_photos_bucket.grant_read(cafe_lambda)

        cafe_lambda.add_environment("CAFE_PHOTOS_BUCKET",value=cafe_photos_bucket.bucket_name)


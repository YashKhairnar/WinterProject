from aws_cdk import (
    # Duration,
    Stack,
    aws_lambda as _lambda,
    aws_apigateway as apigw,
    # aws_sqs as sqs,
)
from constructs import Construct

class InfraStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # The code that defines your stack goes here
        #Creates a Lambda function based on code in /backend
        simple_lambda = _lambda.Function(
            self, "simplelambda",
            runtime = _lambda.Runtime.PYTHON_3_11,
            handler = "lambda_handler.handler",
            code = _lambda.Code.from_asset("../backend")   
            )

        #Creates a REST API that forwards all requests to the Lambda function
        api = apigw.LambdaRestApi(
            self, 'simpleapi',
            handler = simple_lambda,
            proxy = True
        )

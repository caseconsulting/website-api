# website-api

```
.
├── .aws-sam                    <-- Packaged SAM function [temporary]
├── events                      <-- Sample events
│   └── upload.json             <-- Sample event for upload Lambda function
├── upload                      <-- Source code for the upload Lambda function
│   └── index.js                <-- Lambda function code
│   └── package.json            <-- Lists Node.js module dependencies
│   └── package-lock.json       <-- Locks down specific Node.js module versions
├── env.json                    <-- Environment vars used when functions are invoked locally
├── package.json                <-- Defines development and deployment scripts
├── packaged.yaml               <-- Packaged SAM template [temporary]
├── README.MD                   <-- This instructions file
├── template.yaml               <-- SAM template
```

NOTE: _upload_ function is based on _s3-signed-urls_ from https://github.com/chriscoombs/s3-signed-urls

## Requirements

- AWS CLI already configured with Administrator permission
- [Install NodeJS 8.10+](https://nodejs.org/en/download/releases/)
- _Optional:_ [Install Docker](https://www.docker.com/community-edition)

## Setup process

### Local development

**Invoking function locally using a local sample payload**

```bash
sam local invoke UploadFunction --event samples/upload.json
```

**Invoking function locally through local API Gateway**

```bash
sam local start-api
```

If the previous command ran successfully you should now be able to hit the following local endpoint to invoke your function `http://localhost:3000/upload`

**SAM CLI** is used to emulate both Lambda and API Gateway locally and uses our `template.yaml` to understand how to bootstrap this environment (runtime, where the source code is, etc.) - The following excerpt is what the CLI will read in order to initialize an API and its routes:

```yaml
---
Events:
  postProxy:
    Type: Api # More info about API Event Source: https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#api
    Properties:
    Path: /{proxy+}
    Method: put
```

## Packaging and deployment

AWS Lambda NodeJS runtime requires a flat folder with all dependencies including the application. SAM will use `CodeUri` property to know where to look up for both application and dependencies:

```yaml
...
    UploadFunction:
        Type: AWS::Serverless::Function
        Properties:
            CodeUri: upload/
            ...
```

Firstly, we need an `S3 bucket` where we can upload our Lambda functions packaged as ZIP before we deploy anything - If you don't have a S3 bucket to store code artifacts then this is a good time to create one:

```bash
aws s3 mb s3://<REPLACE_THIS_WITH_YOUR_S3_BUCKET_NAME>
```

Next, run the following command to package our Lambda function to S3:

```bash
sam package \
    --output-template-file packaged.yaml \
    --s3-bucket <REPLACE_THIS_WITH_YOUR_S3_BUCKET_NAME>
```

Next, the following command will create a Cloudformation Stack and deploy your SAM resources.

```bash
sam deploy \
    --template-file packaged.yaml \
    --stack-name <REPLACE_WITH_YOUR_STACK_NAME> \
    --capabilities CAPABILITY_IAM
```

> **See [Serverless Application Model (SAM) HOWTO Guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-quick-start.html) for more details in how to get started.**

After deployment is complete you can run the following command to retrieve the API Gateway Endpoint URL:

```bash
aws cloudformation describe-stacks \
    --stack-name <REPLACE_WITH_YOUR_STACK_NAME> \
    --query 'Stacks[].Outputs[?OutputKey==`UploadApi`]' \
    --output table
```

## Fetch, tail, and filter Lambda function logs

To simplify troubleshooting, SAM CLI has a command called sam logs. sam logs lets you fetch logs generated by your Lambda function from the command line. In addition to printing the logs on the terminal, this command has several nifty features to help you quickly find the bug.

`NOTE`: This command works for all AWS Lambda functions; not just the ones you deploy using SAM.

```bash
sam logs -n UploadFunction --stack-name <REPLACE_WITH_YOUR_STACK_NAME> --tail
```

You can find more information and examples about filtering Lambda function logs in the [SAM CLI Documentation](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-logging.html).

## Testing

We use `jasmine` for testing our code and it is already added in `package.json` under `scripts`, so that we can simply run the following command to run our tests:

```bash
cd upload
npm install
npm run test
```

## Cleanup

In order to delete our Serverless Application recently deployed you can use the following AWS CLI Command:

```bash
aws cloudformation delete-stack --stack-name <REPLACE_WITH_YOUR_STACK_NAME>
```

## Bringing to the next level

Here are a few things you can try to get more acquainted with building serverless applications using SAM:

### Learn how SAM Build can help you with dependencies

- Build the project with `sam build --use-container`
- Invoke with `sam local invoke UploadFunction --event samples/upload.json`
- Update tests

### Create an additional API resource

- Create a catch all resource (e.g. /upload/{proxy+}) and return the name requested through this new path
- Update tests

### Step-through debugging

- **[Enable step-through debugging docs for supported runtimes](<(https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-using-debugging.html)>)**

Next, you can use AWS Serverless Application Repository to deploy ready to use Apps that go beyond hello world samples and learn how authors developed their applications: [AWS Serverless Application Repository main page](https://aws.amazon.com/serverless/serverlessrepo/)

# Appendix

## Building the project

[AWS Lambda requires a flat folder](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-create-deployment-pkg.html) with the application as well as its dependencies in a node_modules folder. When you make changes to your source code or dependency manifest,
run the following command to build your project local testing and deployment:

```bash
sam build
```

If your dependencies contain native modules that need to be compiled specifically for the operating system running on AWS Lambda, use this command to build inside a Lambda-like Docker container instead:

```bash
sam build --use-container
```

By default, this command writes built artifacts to `.aws-sam/build` folder.

## SAM and AWS CLI commands

All commands used throughout this document

```bash
# Invoke function locally with event.json as an input
sam local invoke UploadFunction --event events/upload.json

# Run API Gateway locally
sam local start-api

# Create S3 bucket
aws s3 mb s3://<REPLACE_THIS_WITH_YOUR_S3_BUCKET_NAME>

# Package Lambda function defined locally and upload to S3 as an artifact
sam package \
    --output-template-file packaged.yaml \
    --s3-bucket <REPLACE_THIS_WITH_YOUR_S3_BUCKET_NAME>

# Deploy SAM template as a CloudFormation stack
sam deploy \
    --template-file packaged.yaml \
    --stack-name <REPLACE_WITH_YOUR_STACK_NAME> \
    --capabilities CAPABILITY_IAM

# Describe Output section of CloudFormation stack previously created
aws cloudformation describe-stacks \
    --stack-name <REPLACE_WITH_YOUR_STACK_NAME> \
    --query 'Stacks[].Outputs[?OutputKey==`UploadApi`]' \
    --output table

# Tail Lambda function Logs using Logical name defined in SAM Template
sam logs -n UploadFunction --stack-name <REPLACE_WITH_YOUR_STACK_NAME> --tail
```

**NOTE**: Alternatively this could be part of package.json scripts section.

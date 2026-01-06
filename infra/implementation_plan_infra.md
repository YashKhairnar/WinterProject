# Implementation Plan - Infrastructure Upgrades (Nook)

Audit and enhance the existing AWS CDK infrastructure to ensure it's fully ready for production deployment, using the prefix 'nook' for all resources.

## User Review Required

> [!IMPORTANT]
> - **Cognito User Pool**: Adding a Cognito User Pool and Client named with 'nook'.
> - **Resource Renaming**: All existing resources (VPC, Lambda, RDS, S3) will be renamed to include the 'nook' prefix.

## Proposed Changes

### Infrastructure (CDK)

#### [MODIFY] [infra_stack.py](file:///Users/yash/Desktop/WinterProject/infra/infra/infra_stack.py)
- [ ] Rename all constructs (VPC, RDS, S3, APIGW, Lambda) with 'nook' prefix.
- [ ] Add `aws_cognito` constructs:
    - User Pool: `nook-user-pool`
    - User Pool Client: `nook-user-pool-client`
- [ ] Add static site hosting for the Admin Frontend:
    - S3 Bucket: `nook-admin-frontend`
    - CloudFront Distribution: `nook-admin-dist`
- [ ] Add `CfnOutput` for all critical resource IDs (API URL, CloudFront URL, User Pool ID, etc.)
- [ ] (Optional) Add custom domain and SSL certificate configuration.

---

### Backend

#### [MODIFY] [main.py](file:///Users/yash/Desktop/WinterProject/backend/app/main.py)
- [ ] (Future) Add Cognito token verification middleware for authenticated routes.

---

### Frontend (Mobile & Admin)

#### [MODIFY] [_layout.tsx](file:///Users/yash/Desktop/WinterProject/frontend/app/_layout.tsx)
- [ ] Replace hardcoded Cognito `userPoolId` and `userPoolClientId` with `process.env.EXPO_PUBLIC_USER_POOL_ID` and `process.env.EXPO_PUBLIC_USER_POOL_CLIENT_ID`.

#### [NEW] [.env](file:///Users/yash/Desktop/WinterProject/frontend/.env)
- [ ] Add `EXPO_PUBLIC_USER_POOL_ID`, `EXPO_PUBLIC_USER_POOL_CLIENT_ID`, and `EXPO_PUBLIC_API_URL` (local or prod).

## Verification Plan

### Automated Tests
- Run `cdk synth` to verify the stack synthesizes correctly.
- Use `cdk diff` to see the proposed infrastructure changes.

### Manual Verification
- Deploy the stack to a staging environment (`cdk deploy`).
- Verify that the Admin Frontend is accessible via the CloudFront URL.
- Verify that users can sign up/login using the new Cognito User Pool.
- Verify that the Lambda can still access the RDS instance and S3 bucket.

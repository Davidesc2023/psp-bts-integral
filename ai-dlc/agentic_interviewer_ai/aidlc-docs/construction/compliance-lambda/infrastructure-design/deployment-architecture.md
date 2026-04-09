# Deployment Architecture — compliance-lambda (Unit 5)

**Unidad**: Unit 5 - entrevista-compliance
**Generado**: 2026-04-08
**IaC**: AWS SAM (template.yaml)
**Region**: us-east-1

---

## Diagrama de arquitectura de deployment

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AWS us-east-1                                   │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                    API Gateway HTTP API                                  │ │
│  │            entrevista-compliance-api ($default stage)                   │ │
│  │    POST /consent  GET /audit/*  POST /nps  GET /nps/*  GET /compliance/ │ │
│  └──────────────────────────────┬──────────────────────────────────────────┘ │
│                                  │                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │              Lambda: entrevista-compliance (arm64, 512MB)               │ │
│  │              Reserved concurrency: 300                                  │ │
│  │              Timeout: 30s (HTTP) / 300s (scheduler)                    │ │
│  └──────┬────────────┬──────────────┬───────────────────┬──────────────────┘ │
│         │            │              │                   │                     │
│  ┌──────▼──┐  ┌──────▼──────────────▼──┐  ┌────────────▼─────────────────┐  │
│  │Secrets  │  │  MongoDB Atlas M10      │  │  Amazon SNS                  │  │
│  │Manager  │  │  entrevista_compliance  │  │  entrevista-compliance-alerts│  │
│  │(3 secrts│  │  7 colecciones + 1 aux  │  └──────────────────────────────┘  │
│  └─────────┘  │  Encryption at Rest     │                                    │
│               │  (AWS KMS CMK)          │  ┌──────────────────────────────┐  │
│               └─────────────────────────┘  │  CloudWatch                  │  │
│                                            │  Logs + Metrics + 5 Alarms   │  │
│  ┌──────────────────────────────────────┐  └──────────────────────────────┘  │
│  │  Amazon EventBridge (default bus)    │                                    │
│  │                                      │  ┌──────────────────────────────┐  │
│  │  Rules:                              │  │  AWS X-Ray                   │  │
│  │  - compliance-consent-rule           │  │  Traces + Subsegmentos       │  │
│  │  - compliance-eval-rule              │  └──────────────────────────────┘  │
│  │  - compliance-session-rule           │                                    │
│  │  - compliance-escalation-rule        │  ┌──────────────────────────────┐  │
│  │                                      │  │  AWS KMS                     │  │
│  │  Scheduler:                          │  │  alias/entrevista-compliance  │  │
│  │  - compliance-retention-purge        │  │  -atlas                      │  │
│  │    cron(0 2 * * ? *)                 │  └──────────────────────────────┘  │
│  └──────────┬───────────────────────────┘                                    │
│             │ (DLQ para eventos fallidos)                                     │
│  ┌──────────▼───────────────────────────────────────────────────────────┐    │
│  │  SQS: entrevista-compliance-dlq                                       │    │
│  └──────────────────────────────┬────────────────────────────────────────┘    │
│                                  │                                            │
│  ┌───────────────────────────────▼──────────────────────────────────────┐    │
│  │  Lambda: entrevista-compliance-dlq-processor (arm64, 256MB)          │    │
│  │  Batch size: 1 | Max concurrency: 2 | Timeout: 60s                   │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘

Integraciones externas:
  conversation-lambda ──EventBridge──→ compliance-lambda (consent.recorded)
  evaluation-lambda ───EventBridge──→ compliance-lambda (evaluation.completed)
  dashboard ───────────API GW HTTP──→ compliance-lambda (GET /audit/*)
  MongoDB Atlas Change Stream ───────→ SNS (tamper detection)
```

---

## Estructura del proyecto (directorios)

```
services/entrevista-compliance/
├── template.yaml                    # SAM template
├── pyproject.toml                   # uv workspace member
├── app/
│   ├── main.py                      # Lambda handler (Mangum + EventBridge dispatcher)
│   ├── config.py                    # Settings (pydantic-settings, lee de Secrets Manager)
│   ├── router.py                    # FastAPI app + routers registration
│   ├── routers/
│   │   ├── consent_router.py        # POST /consent
│   │   ├── audit_router.py          # GET /audit/*
│   │   ├── nps_router.py            # POST /nps, GET /nps/*
│   │   └── compliance_report_router.py  # GET /compliance/report/* (501 stub)
│   ├── components/
│   │   ├── consent_manager.py       # LC-02
│   │   ├── audit_logger.py          # LC-03
│   │   ├── session_counter_store.py # LC-04
│   │   ├── nps_collector.py         # LC-05
│   │   ├── escalation_alert_manager.py  # LC-06
│   │   └── data_retention_manager.py    # LC-07
│   ├── handlers/
│   │   ├── eventbridge_dispatcher.py  # Rutea eventos EventBridge al componente correcto
│   │   └── scheduler_handler.py       # Handler para EventBridge Scheduler (purge)
│   ├── db/
│   │   └── motor_client.py          # Singleton de conexion MongoDB (PAT-09)
│   └── models/
│       ├── consent.py               # Pydantic models ConsentRecord
│       ├── audit.py                 # Pydantic models AuditEvent, AuditTranscript
│       ├── nps.py                   # Pydantic models NPSResponse
│       ├── escalation.py            # Pydantic models EscalationRecord
│       └── retention.py             # Pydantic models CampaignRetentionConfig
├── dlq_processor/
│   └── handler.py                   # entrevista-compliance-dlq-processor Lambda
└── tests/
    ├── unit/
    │   ├── test_consent_manager.py
    │   ├── test_audit_logger.py
    │   ├── test_chain_hash.py        # 100% coverage obligatorio
    │   ├── test_nps_collector.py
    │   ├── test_data_retention.py    # 100% coverage obligatorio
    │   └── test_eventbridge_dispatcher.py
    └── integration/
        ├── test_consent_flow.py
        ├── test_audit_flow.py
        ├── test_nps_flow.py
        └── test_retention_flow.py
```

---

## SAM Template (template.yaml) — estructura

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: entrevista-compliance Lambda - Unit 5

Parameters:
  Environment:
    Type: String
    AllowedValues: [dev, staging, prod]
  MongodbSecretName:
    Type: String
  SnsSecretName:
    Type: String
  JwtSecretName:
    Type: String

Globals:
  Function:
    Runtime: python3.12
    Architectures: [arm64]
    Environment:
      Variables:
        MONGODB_SECRET_NAME: !Ref MongodbSecretName
        SNS_SECRET_NAME: !Ref SnsSecretName
        JWT_SECRET_NAME: !Ref JwtSecretName
        ENVIRONMENT: !Ref Environment
        AWS_XRAY_SDK_ENABLED: "true"
    Tracing: Active
    Layers: []

Resources:

  # --- Lambda principal ---
  ComplianceFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub "entrevista-compliance-${Environment}"
      CodeUri: .
      Handler: app.main.handler
      MemorySize: 512
      Timeout: 30
      ReservedConcurrentExecutions: 300
      Role: !GetAtt ComplianceFunctionRole.Arn
      Events:
        # API Gateway HTTP
        ApiEvent:
          Type: HttpApi
          Properties:
            ApiId: !Ref ComplianceHttpApi
        # EventBridge rules
        ConsentRecorded:
          Type: EventBridgeRule
          Properties:
            Pattern:
              detail-type: [consent.recorded]
        EvaluationCompleted:
          Type: EventBridgeRule
          Properties:
            Pattern:
              detail-type: [evaluation.completed]
        SessionCompleted:
          Type: EventBridgeRule
          Properties:
            Pattern:
              detail-type: [session.completed]
        EscalationRequested:
          Type: EventBridgeRule
          Properties:
            Pattern:
              detail-type: [escalation.requested]
        # Scheduler diario
        RetentionPurgeSweep:
          Type: ScheduleV2
          Properties:
            ScheduleExpression: "cron(0 2 * * ? *)"
            Input: '{"detail-type": "retention.purge_sweep", "source": "aws.scheduler"}'

  # --- Lambda DLQ Processor ---
  ComplianceDLQProcessor:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub "entrevista-compliance-dlq-processor-${Environment}"
      CodeUri: .
      Handler: dlq_processor.handler
      MemorySize: 256
      Timeout: 60
      ReservedConcurrentExecutions: 5
      Role: !GetAtt ComplianceDLQProcessorRole.Arn
      Events:
        DLQEvent:
          Type: SQS
          Properties:
            Queue: !GetAtt ComplianceDLQ.Arn
            BatchSize: 1
            MaximumConcurrency: 2

  # --- API Gateway HTTP ---
  ComplianceHttpApi:
    Type: AWS::Serverless::HttpApi
    Properties:
      StageName: "$default"
      CorsConfiguration:
        AllowOrigins:
          - "https://entrevista-dashboard.vercel.app"
        AllowMethods: [GET, POST, OPTIONS]
        AllowHeaders: [Authorization, Content-Type]
      DefaultRouteSettings:
        ThrottlingBurstLimit: 300
        ThrottlingRateLimit: 100

  # --- SQS DLQ ---
  ComplianceDLQ:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: !Sub "entrevista-compliance-dlq-${Environment}"
      VisibilityTimeout: 30
      MessageRetentionPeriod: 1209600  # 14 dias
      ReceiveMessageWaitTimeSeconds: 20
      SqsManagedSseEnabled: true

  # --- SNS Topic ---
  ComplianceAlertsTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: !Sub "entrevista-compliance-alerts-${Environment}"
      DisplayName: "EntreVista Compliance Alerts"
      KmsMasterKeyId: "alias/aws/sns"

  # --- CloudWatch Alarms (5) ---
  AlarmLambdaErrors:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub "ComplianceLambdaErrors-${Environment}"
      MetricName: Errors
      Namespace: AWS/Lambda
      Dimensions:
        - Name: FunctionName
          Value: !Ref ComplianceFunction
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 1
      Threshold: 5
      ComparisonOperator: GreaterThanThreshold
      AlarmActions: [!Ref ComplianceAlertsTopic]

  AlarmLambdaThrottle:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub "ComplianceLambdaThrottle-${Environment}"
      MetricName: Throttles
      Namespace: AWS/Lambda
      Dimensions:
        - Name: FunctionName
          Value: !Ref ComplianceFunction
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 1
      Threshold: 10
      ComparisonOperator: GreaterThanThreshold
      AlarmActions: [!Ref ComplianceAlertsTopic]

  AlarmLambdaDuration:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub "ComplianceLambdaDuration-${Environment}"
      MetricName: Duration
      Namespace: AWS/Lambda
      Dimensions:
        - Name: FunctionName
          Value: !Ref ComplianceFunction
      ExtendedStatistic: "p99"
      Period: 300
      EvaluationPeriods: 1
      Threshold: 1200
      ComparisonOperator: GreaterThanThreshold
      AlarmActions: [!Ref ComplianceAlertsTopic]

  AlarmDLQMessages:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub "ComplianceDLQMessages-${Environment}"
      MetricName: ApproximateNumberOfMessagesVisible
      Namespace: AWS/SQS
      Dimensions:
        - Name: QueueName
          Value: !GetAtt ComplianceDLQ.QueueName
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 1
      Threshold: 0
      ComparisonOperator: GreaterThanThreshold
      AlarmActions: [!Ref ComplianceAlertsTopic]

  # Alarm AuditTamperDetected requiere MetricFilter en CloudWatch Logs
  # Se define despues de que el Log Group existe (post-primer-deploy)

  # --- CloudWatch Log Group ---
  ComplianceLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Sub "/aws/lambda/entrevista-compliance-${Environment}"
      RetentionInDays: !If [IsProd, 90, !If [IsStaging, 30, 7]]

  # --- KMS CMK ---
  ComplianceAtlasCMK:
    Type: AWS::KMS::Key
    Properties:
      Description: "CMK para MongoDB Atlas Encryption at Rest - entrevista-compliance"
      EnableKeyRotation: true
      KeyPolicy:
        Version: "2012-10-17"
        Statement:
          - Sid: "EnableAccountAdmin"
            Effect: Allow
            Principal:
              AWS: !Sub "arn:aws:iam::${AWS::AccountId}:root"
            Action: "kms:*"
            Resource: "*"

  ComplianceAtlasCMKAlias:
    Type: AWS::KMS::Alias
    Properties:
      AliasName: "alias/entrevista-compliance-atlas"
      TargetKeyId: !Ref ComplianceAtlasCMK

Conditions:
  IsProd: !Equals [!Ref Environment, prod]
  IsStaging: !Equals [!Ref Environment, staging]

Outputs:
  ComplianceFunctionArn:
    Value: !GetAtt ComplianceFunction.Arn
    Export:
      Name: !Sub "entrevista-compliance-function-arn-${Environment}"
  ComplianceApiEndpoint:
    Value: !Sub "https://${ComplianceHttpApi}.execute-api.${AWS::Region}.amazonaws.com"
    Export:
      Name: !Sub "entrevista-compliance-api-endpoint-${Environment}"
  ComplianceAlertsTopicArn:
    Value: !Ref ComplianceAlertsTopic
    Export:
      Name: !Sub "entrevista-compliance-alerts-arn-${Environment}"
  ComplianceDLQArn:
    Value: !GetAtt ComplianceDLQ.Arn
    Export:
      Name: !Sub "entrevista-compliance-dlq-arn-${Environment}"
```

---

## Comandos de deployment

### Build y deploy (usando uv + SAM)
```bash
# En la raiz del workspace
uv sync

# Build del artifact Lambda
cd services/entrevista-compliance
uv pip install --target .aws-sam/build/ComplianceFunction .
sam build --use-container

# Deploy por entorno
sam deploy \
  --stack-name entrevista-compliance-prod \
  --parameter-overrides \
    Environment=prod \
    MongodbSecretName="entrevista/compliance/mongodb-uri" \
    SnsSecretName="entrevista/compliance/sns-topic-arn" \
    JwtSecretName="entrevista/compliance/jwt-secret" \
  --capabilities CAPABILITY_IAM \
  --region us-east-1
```

### Crear secretos (primera vez)
```bash
aws secretsmanager create-secret \
  --name "entrevista/compliance/mongodb-uri" \
  --secret-string "mongodb+srv://compliance-lambda-user:<PASSWORD>@entrevista-cluster.mongodb.net/entrevista_compliance?tls=true" \
  --region us-east-1

aws secretsmanager create-secret \
  --name "entrevista/compliance/jwt-secret" \
  --secret-string "<32-bytes-hex-secret>" \
  --region us-east-1
```

---

## Dependencias de deployment externas

Estos recursos deben existir **antes** de hacer el primer deploy de compliance-lambda:

| Recurso | Unidad propietaria | Estado |
|---------|-------------------|--------|
| MongoDB Atlas Cluster `entrevista-cluster` | Infraestructura compartida | Requiere provisionamiento manual |
| MongoDB database `entrevista_compliance` + colecciones + indices | Este deploy (script de init) | Script en `scripts/init-mongodb.js` |
| Atlas Change Stream Trigger `compliance-tamper-detection` | Configuracion manual en Atlas UI | Post-deploy |
| JWT Secret en Secrets Manager | auth-lambda (Unit 6) | Ya creado |
| EventBridge default bus | AWS native (ya existe) | Disponible |

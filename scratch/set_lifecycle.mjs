import { S3Client, PutBucketLifecycleConfigurationCommand } from "@aws-sdk/client-s3";

const accountId = "160179004a88d4a1df12599e179131f3";
const accessKeyId = "a229ab0c703a38047c86b00d453667bf";
const secretAccessKey = "1be9575d16cf66c0a36e659ac4c3a5ddd946b8d693780cc968d4f3516267d397";
const bucketName = "minipdm-storage";

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

async function setLifecycle() {
  try {
    const command = new PutBucketLifecycleConfigurationCommand({
      Bucket: bucketName,
      LifecycleConfiguration: {
        Rules: [
          {
            ID: "Delete-Batch-Orders-After-7-Days",
            Filter: {
              Prefix: "batch_orders/",
            },
            Status: "Enabled",
            Expiration: {
              Days: 7,
            },
          },
        ],
      },
    });

    const response = await s3Client.send(command);
    console.log("Successfully set lifecycle rule:", response);
  } catch (error) {
    console.error("Error setting lifecycle rule:", error);
  }
}

setLifecycle();

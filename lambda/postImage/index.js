import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.S3_ENDPOINT,     // localstack: http://s3.localhost.localstack.cloud:4566
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
  },
});

export const handler = async (event) => {
  try {
    const contentType = event.headers["content-type"] || event.headers["Content-Type"];

    // Body en base64 (API Gateway)
    const body = Buffer.from(event.body, "base64");

    const key = `uploads/${Date.now()}.bin`;

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.BUCKET_IMAGES,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "OK",
        key,
        url: `${process.env.S3_PUBLIC_URL}/${key}`,
      }),
    };
  } catch (err) {
    console.error("Upload error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
<?php

namespace App\Services;

use Aws\S3\S3Client;
use Aws\S3\Exception\S3Exception;
use Aws\S3\S3UriParser;
use Illuminate\Support\Facades\Log;
use Ramsey\Uuid\Uuid;

class StorageService
{
    private S3Client $s3;
    private string   $bucket;
    private int      $presignedTtl;

    public function __construct()
    {
        $this->s3 = new S3Client([
            'version'     => 'latest',
            'region'      => config('services.aws.region', 'eu-west-2'),
            'credentials' => [
                'key'    => config('services.aws.key'),
                'secret' => config('services.aws.secret'),
            ],
        ]);

        $this->bucket      = config('services.aws.bucket');
        $this->presignedTtl = (int) config('services.aws.presigned_ttl', 900);
    }

    public function upload(
        string $prescriptionId,
        string $originalFilename,
        string $mimeType,
        string $contents,
    ): array {
        $ext    = pathinfo($originalFilename, PATHINFO_EXTENSION);
        $s3Key  = "prescriptions/{$prescriptionId}/documents/" . Uuid::uuid4()->toString() . '.' . $ext;

        $this->s3->putObject([
            'Bucket'               => $this->bucket,
            'Key'                  => $s3Key,
            'Body'                 => $contents,
            'ContentType'          => $mimeType,
            'ServerSideEncryption' => 'AES256',
            'Metadata'             => [
                'original-filename' => rawurlencode($originalFilename),
                'prescription-id'   => $prescriptionId,
            ],
        ]);

        return [
            's3_key'   => $s3Key,
            'bucket'   => $this->bucket,
            'size'     => strlen($contents),
        ];
    }

    public function generatePresignedUrl(string $s3Key): string
    {
        $cmd = $this->s3->getCommand('GetObject', [
            'Bucket' => $this->bucket,
            'Key'    => $s3Key,
        ]);

        $request = $this->s3->createPresignedRequest($cmd, "+{$this->presignedTtl} seconds");

        return (string) $request->getUri();
    }

    /**
     * Deletes an S3 object. Non-fatal — logs warning on failure
     * to avoid blocking the UX for a storage error.
     */
    public function delete(string $s3Key): void
    {
        try {
            $this->s3->deleteObject(['Bucket' => $this->bucket, 'Key' => $s3Key]);
        } catch (S3Exception $e) {
            Log::warning("S3 delete failed for key [{$s3Key}]: " . $e->getMessage());
        }
    }
}

import { createHash } from 'node:crypto';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

// ─── R2 Storage Client (exact LangoWorld pattern) ───

export class R2StorageService {
    private readonly client: S3Client | null;
    private readonly bucket: string;
    private readonly publicUrl: string;
    private readonly prefix: string;

    constructor(config: {
        accountId?: string;
        accessKeyId?: string;
        secretAccessKey?: string;
        bucketName?: string;
        publicUrl?: string;
        voicePrefix?: string;
    }) {
        if (!config.accountId || !config.accessKeyId || !config.secretAccessKey || !config.bucketName) {
            this.client = null;
            this.bucket = '';
            this.publicUrl = '';
            this.prefix = '';
            console.warn('[R2Storage] Not configured — voice caching disabled');
            return;
        }

        this.client = new S3Client({
            region: 'auto',
            endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
            },
        });

        this.bucket = config.bucketName;
        this.publicUrl = (config.publicUrl ?? '').replace(/\/$/, '');
        this.prefix = (config.voicePrefix ?? 'LifeBridgeAI/voice-tts').replace(/\/$/, '');
        console.log(`[R2Storage] Initialized: bucket=${this.bucket}, prefix=${this.prefix}`);
    }

    /** SHA-256 hash of text (32 chars) — deterministic key */
    computeTextHash(text: string): string {
        return createHash('sha256').update(text.trim()).digest('hex').substring(0, 32);
    }

    /** R2 key for audio: {prefix}/{textHash}-{language}.wav */
    getAudioKey(textHash: string, language: string): string {
        return `${this.prefix}/${textHash}-${language}.wav`;
    }

    /** HEAD check — does the audio exist in R2? Returns public URL or null */
    async checkExists(key: string): Promise<string | null> {
        if (!this.client) return null;

        try {
            await this.client.send(new HeadObjectCommand({
                Bucket: this.bucket,
                Key: key,
            }));
            return `${this.publicUrl}/${key}`;
        } catch (error: any) {
            if (error?.name === 'NotFound' || error?.$metadata?.httpStatusCode === 404) {
                return null;
            }
            console.warn('[R2Storage] HEAD check error:', error?.name || error);
            return null;
        }
    }

    /** Upload audio buffer to R2, returns public URL */
    async upload(key: string, audioBuffer: Buffer, contentType: string): Promise<string> {
        if (!this.client) throw new Error('R2 not configured');

        await this.client.send(new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: audioBuffer,
            ContentType: contentType,
            CacheControl: 'public, max-age=31536000, immutable',
        }));

        const url = `${this.publicUrl}/${key}`;
        console.log(`[R2Storage] Uploaded: ${key} (${audioBuffer.length} bytes)`);
        return url;
    }

    get isConfigured(): boolean {
        return this.client !== null;
    }
}

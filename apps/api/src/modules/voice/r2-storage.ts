import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';

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

    /** Generate a 32-char hash key from text + locale + voice */
    generateKey(text: string, locale: string, voiceName: string): string {
        const hash = createHash('sha256')
            .update(`${text}|${locale}|${voiceName}`)
            .digest('hex')
            .slice(0, 32);
        return `${this.prefix}/${hash}`;
    }

    /** Check if audio already exists in R2 */
    async exists(key: string): Promise<boolean> {
        if (!this.client) return false;

        try {
            await this.client.send(new HeadObjectCommand({
                Bucket: this.bucket,
                Key: key,
            }));
            return true;
        } catch {
            return false;
        }
    }

    /** Upload audio to R2, returns public URL */
    async upload(key: string, audioBuffer: Buffer, mimeType: string): Promise<string | null> {
        if (!this.client) return null;

        try {
            const ext = mimeType.includes('wav') ? 'wav' : mimeType.includes('mp3') ? 'mp3' : 'audio';
            const fullKey = `${key}.${ext}`;

            await this.client.send(new PutObjectCommand({
                Bucket: this.bucket,
                Key: fullKey,
                Body: audioBuffer,
                ContentType: mimeType,
                CacheControl: 'public, max-age=31536000, immutable',
            }));

            const url = `${this.publicUrl}/${fullKey}`;
            console.log(`[R2Storage] Uploaded: ${fullKey}`);
            return url;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`[R2Storage] Upload failed: ${message}`);
            return null;
        }
    }

    /** Get public URL for a cached audio file */
    getPublicUrl(key: string, mimeType: string): string {
        const ext = mimeType.includes('wav') ? 'wav' : mimeType.includes('mp3') ? 'mp3' : 'audio';
        return `${this.publicUrl}/${key}.${ext}`;
    }

    get isConfigured(): boolean {
        return this.client !== null;
    }
}

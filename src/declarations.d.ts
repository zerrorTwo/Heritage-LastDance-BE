declare module 'streamifier' {
  export function createReadStream(data: Buffer | string): NodeJS.ReadableStream;
}

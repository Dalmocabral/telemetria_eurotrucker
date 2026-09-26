export class BlobSource {
  constructor(blob, key) {
    this.blob = blob;
    this.key = key;
  }

  async getBytes(offset, length) {
    const slice = this.blob.slice(offset, offset + length);
    const arrayBuffer = await slice.arrayBuffer();
    return { data: arrayBuffer };
  }

  getKey() {
    return this.key;
  }
}

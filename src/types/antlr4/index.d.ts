declare module 'antlr4/index' {
  export class FileStream {
    sourceName: string;
    constructor(fileName: string);
    load(fileName: string, encoding?: string): void;
  }

  export class CommonTokenStream {
    constructor(tokenSource: TokenSource, channel?: number);
    tryLT(k: number): Token | undefined;
    getNumberOfOnChannelTokens(): number;
  }

  export class TokenSource{}
  export class Token{}
}

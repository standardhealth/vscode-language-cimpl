import { CommonTokenStream } from "antlr4/index";

declare module 'SHRDataElementParser' {
  export function SHRDataElementParser(input: CommonTokenStream): Object;
}

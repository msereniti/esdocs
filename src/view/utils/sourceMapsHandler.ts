export const sourceMapsHandler = async (mappings: string, sourcesContent: string[], compiledContent: string) => {
  // await import('source-map');
  // const sourceMapLib = await import('source-map/lib/mappings.wasm');
  // const sourceMapModule = await sourceMapLib.default({
  //   env: { mapping_callback: console.log },
  // });
  // console.log(sourceMapModule.allocate_mappings());
  // console.log(sourceMapModule.parse_mappings());
  // const variablesMapping = {};
  // console.log(compiledContent);
  // console.log(sourcesContent);
  // const decodedMappings = mappings.split(',').map(base64VlqDecode);
  // for (const mapping of decodedMappings) {
  //   const [compiledLineNumber, sourcesContentIndex, lineNumber, columnNumber] =
  //     mapping;
  //   const compiledLine = compiledContent.split(';')[compiledLineNumber];
  //   if (compiledLine?.startsWith('var ')) {
  //     const minifiedVariableName = compiledLine.substring(
  //       'var '.length,
  //       compiledLine.indexOf('=')
  //     );
  //     const source = sourcesContent[sourcesContentIndex];
  //     const sourceLine = source.split('\n')[lineNumber];
  //     console.log(minifiedVariableName);
  //     console.log(sourceLine);
  //   }
  // console.log(compiledContent.split(';')[compiledLine]);
  // console.log(
  //   lineNumber,
  //   columnNumber,
  //   lines[lineNumber].substring(columnNumber)
  // );
  // }
  // console.log();
  // console.log(compiledCode);
  // console.log(sourceCode);
};

// https://www.lucidchart.com/techblog/2019/08/22/decode-encoding-base64-vlqs-source-maps/

// const BIT_MASKS = {
//   LEAST_FOUR_BITS: 0b1111,
//   LEAST_FIVE_BITS: 0b11111,
//   CONTINUATION_BIT: 0b100000,
//   SIGN_BIT: 0b1,
// };

// const BASE64_ALPHABET =
//   'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// const REVERSE_BASE64_ALPHABET: Map<string, number> = (() => {
//   const characterIndexPairs = BASE64_ALPHABET.split('').map<[string, number]>(
//     (c: string, i: number) => [c, i]
//   );

//   return new Map<string, number>(characterIndexPairs);
// })();

// const base64VlqDecode = (base64Vlqs: string): number[] => {
//   const vlqs: number[] = base64Decode(base64Vlqs);

//   return splitVlqs(vlqs).map(vlqDecode);
// };

// const base64Decode = (base64Vlqs: string): number[] =>
//   base64Vlqs.split('').map((c) => {
//     const sextet = REVERSE_BASE64_ALPHABET.get(c);

//     if (sextet === undefined) {
//       throw new Error(`${base64Vlqs} is not a valid base64 encoded VLQ`);
//     }

//     return sextet;
//   });

// const splitVlqs = (vlqs: number[]): number[][] => {
//   const splitVlqs: number[][] = [];
//   let vlq: number[] = [];

//   vlqs.forEach((sextet: number) => {
//     vlq.push(sextet);
//     if ((sextet & BIT_MASKS.CONTINUATION_BIT) === 0) {
//       splitVlqs.push(vlq);
//       vlq = [];
//     }
//   });
//   if (vlq.length > 0) {
//     throw new Error('Malformed VLQ sequence: The last VLQ never ended.');
//   }

//   return splitVlqs;
// };

// const vlqDecode = (vlq: number[]): number => {
//   let x = 0;
//   let isNegative = false;

//   vlq.reverse().forEach((sextet: number, index: number) => {
//     if (index === vlq.length - 1) {
//       isNegative = (sextet & BIT_MASKS.SIGN_BIT) === 1;
//       sextet >>>= 1; // discard sign bit
//       x <<= 4;
//       x |= sextet & BIT_MASKS.LEAST_FOUR_BITS;
//     } else {
//       x <<= 5;
//       x |= sextet & BIT_MASKS.LEAST_FIVE_BITS;
//     }
//   });

//   return isNegative ? -x : x;
// };

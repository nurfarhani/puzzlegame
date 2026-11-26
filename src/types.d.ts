// Lets TypeScript import bundled asset files (e.g. our WAV sound effects).
declare module '*.wav' {
  const uri: number;
  export default uri;
}

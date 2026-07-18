// Local WOFF files (public/fonts/) matching the app's real type stack
// (font-display: Georgia/Playfair Display, font-body: Nunito/Quicksand,
// see tailwind.config.ts) so generated share images read as genuinely
// on-brand, not default-sans placeholders. Fetched from the app's own
// origin rather than Google Fonts at request time: no external network
// dependency, no risk of Google's CSS/UA-sniffing trick breaking later.
export type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: "normal";
};

export async function loadOgFonts(origin: string): Promise<OgFont[]> {
  const [playfairBold, nunitoRegular, nunitoBold] = await Promise.all([
    fetch(new URL("/fonts/PlayfairDisplay-Bold.woff", origin)).then((r) => r.arrayBuffer()),
    fetch(new URL("/fonts/Nunito-Regular.woff", origin)).then((r) => r.arrayBuffer()),
    fetch(new URL("/fonts/Nunito-Bold.woff", origin)).then((r) => r.arrayBuffer()),
  ]);

  return [
    { name: "Playfair Display", data: playfairBold, weight: 700, style: "normal" },
    { name: "Nunito", data: nunitoRegular, weight: 400, style: "normal" },
    { name: "Nunito", data: nunitoBold, weight: 700, style: "normal" },
  ];
}

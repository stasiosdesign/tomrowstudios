/* MOCKUP CASE STUDIES — for testing the case-study viewer and its steps
   (CaseStudyViewer.astro, casepanel.js) only. Not real content.

   Rayon, ATN and Material Bank, each the first real case study's words and
   pictures duplicated, the pictures dealt in a different order so the
   three look different as the viewer steps through them. None of the
   source's facts are carried (client, date, output, services, website):
   nothing here states anything about these partnerships. Each shows a
   "Mockup" tag where its facts would be (CaseStudyPanel.astro, `mockup`).

   To remove them: delete this file and its use in CaseStudyViewer.astro
   (the import and the mockups added to `studies`). */
import type { PARTNERS_QUERY_RESULT } from '../sanity/sanity.types';

type Partner = PARTNERS_QUERY_RESULT[number];
export type MockupPartner = Partner & { mockup: true };

// Each mockup's name, its id (mockup- so it is never taken for a
// partner's), and how far round its pictures are turned
const MOCKUPS = [
  { name: 'Rayon', slug: 'mockup-rayon', turn: 1 },
  { name: 'ATN', slug: 'mockup-atn', turn: 3 },
  { name: 'Material Bank', slug: 'mockup-material-bank', turn: 5 },
];

/** The three mockups, made from the first of `partners` with a case study */
export function caseStudyMockups(partners: Partner[]): MockupPartner[] {
  const source = partners.find((partner) => partner.caseStudy?.title)?.caseStudy;
  if (!source) return [];
  const pictures = [source.image, ...(source.gallery ?? [])].filter((picture): picture is NonNullable<typeof picture> => Boolean(picture?.asset));
  if (!pictures.length) return [];
  return MOCKUPS.map(({ name, slug, turn }) => {
    const k = turn % pictures.length;
    const turned = [...pictures.slice(k), ...pictures.slice(0, k)].map((picture, i) => ({ ...picture, _key: `${slug}-${i}` }));
    return {
      _id: slug,
      name,
      slug,
      logo: null,
      coverImage: null,
      mockup: true,
      caseStudy: { ...source, title: name, facts: null, image: turned[0], gallery: turned.slice(1) },
    };
  });
}

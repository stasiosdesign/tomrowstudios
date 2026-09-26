/* Makes the shop's four items in Sanity, once, from the words and pictures
   the four hand-written product pages were built with (src/pages/book.astro,
   product.astro, course-communication.astro and course-sketchbook.astro,
   before they became the one route src/pages/[slug].astro): one shopItem
   document each, in the staging dataset, with every paragraph as a Portable
   Text block. Every picture is uploaded from public/ first; Sanity keeps one
   copy of identical files, so running this again uploads nothing new.

   It never overwrites: an item that already exists is left exactly as it is
   ("kept"). To redo one, delete its document in the Studio first.

   The four old page documents (bookPage, productPage,
   courseCommunicationPage, courseSketchbookPage, and their live-<id> copies)
   are NOT deleted here: the script only prints their IDs as a reminder.

   From studio/:
     npx sanity exec scripts/seed-shop.ts --with-user-token */
import fs from 'node:fs'
import path from 'node:path'
import {randomBytes} from 'node:crypto'
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-02-19'}).withConfig({dataset: 'staging'})

// The script runs from studio/ (sanity exec needs its sanity.cli.ts), so the
// site's public/ is one level up
const publicDir = path.resolve(process.cwd(), '..', 'public')

type Picture = {path: string; alt?: string}
type Link = {label: string; href: string}
type Item = {
  slug: string
  sortOrder: number
  title: string
  card: {image: Picture; kind: string; meta: string; text: string; button: string}
  header: {image: Picture; lead: string; tags: string[]}
  details: {
    metaRows: {label: string; value: string}[]
    cta: {rowLabel: string; label: string; href: string; opensContact: boolean}
  }
  overview: {heading: string; body: string[]; image?: Picture}
  whatYouGet: {heading: string; body: string[]; modules?: {name: string; text: string}[]; image?: Picture}
  atlas?: {image: Picture; caption: string; primaryButton: Link; secondaryButton: Link}
}

// The four pages' content, in the shop grid's order
const ITEMS: Item[] = [
  {
    slug: 'product',
    sortOrder: 1,
    title: 'Architectural presentation masterclass',
    card: {
      image: {path: '/assets/photos/thumbnails/thumb-08.jpg', alt: 'Architectural presentation masterclass'},
      kind: 'Course',
      meta: 'Self-paced',
      text: 'A direct method for producing drawings and presentations that communicate clearly',
      button: 'View Course',
    },
    header: {
      image: {path: '/assets/photos/lifestyle/lifestyle-06.jpg'},
      lead: 'Learn how to structure, design and deliver clear architecture presentations',
      tags: ['6 modules', 'Self-paced', 'Lifetime access'],
    },
    details: {
      metaRows: [
        {label: 'Instructor', value: 'Thomas Rowntree'},
        {label: 'Language', value: 'English'},
        {label: 'Includes', value: 'English subtitles'},
      ],
      cta: {rowLabel: 'Enrol', label: 'Enrol now', href: '#', opensContact: false},
    },
    overview: {
      heading: 'Present your work clearly and confidently',
      body: [
        'Strong design work fails when it cannot be understood. You have seen it happen. A student produces a rigorous project but loses the room during a review. A designer has the right answer but cannot land it in a meeting. The work was good. The communication was not.',
        'This course addresses that gap directly. It teaches you to structure a presentation that holds attention. You will learn to select images that do real work rather than fill slides. You will practice verbal techniques that make your thinking accessible without dumbing it down. The goal is not performance. The goal is clarity.',
        'We cover interim reviews, final reviews, and general presentations as distinct situations. Each demands something different. An interim review requires you to show process and invite critique. A final review requires you to demonstrate resolution and defend decisions. A general presentation requires you to connect with an audience that may not share your vocabulary. The course gives you tools for all three.',
        'The methods are practical. You will finish with templates, frameworks, and rehearsed approaches you can use immediately. No theory for its own sake. Only what works when you are standing in front of a panel with fifteen minutes to make your case.',
      ],
      image: {path: '/assets/photos/lifestyle/lifestyle-08.jpg', alt: 'An architecture studio mid-review'},
    },
    whatYouGet: {
      heading: 'What you will learn',
      body: [
        'The course is built around six practical modules. Each one addresses a specific skill you need when presenting architectural work. There is no filler. You move through concept, structure, visuals, physical materials, verbal delivery, and handling critique. By the end you will have a repeatable method for any presentation situation.',
        'Concept-led presentations start with the idea, not the building. You learn to identify the core argument of your project and make every slide serve that argument. If an image does not support the concept, it does not belong in the deck. This module gives you tools to test whether your presentation has a spine or just a sequence.',
        'Structure, narrative and timing covers how to arrange your material so it holds attention from start to finish. You learn to open strong, build a middle that develops your thinking, and close with authority. Timing is treated as a design problem. Fifteen minutes demands a different structure than forty-five. You practice both.',
      ],
      modules: [
        {name: 'Module 1', text: 'Concept-led presentations'},
        {name: 'Module 2', text: 'Structure and timing'},
        {name: 'Module 3', text: 'Graphic communication'},
        {name: 'Module 4', text: 'Physical materials'},
      ],
      image: {path: '/assets/photos/lifestyle/lifestyle-02.jpg', alt: 'Drawings under review'},
    },
  },
  {
    slug: 'course-communication',
    sortOrder: 2,
    title: 'Architecture communication package',
    card: {
      image: {path: '/assets/photos/thumbnails/thumb-09.jpg', alt: 'Architecture communication package'},
      kind: 'Package',
      meta: 'Digital download',
      text: 'Templates, guides, and frameworks for writing about and presenting architectural work',
      button: 'View Course',
    },
    header: {
      image: {path: '/assets/photos/lifestyle/lifestyle-08.jpg'},
      lead: 'Templates, guides and frameworks for writing about and presenting architectural work',
      tags: ['Templates', 'Digital download', 'Lifetime access'],
    },
    details: {
      metaRows: [
        {label: 'Author', value: 'Thomas Rowntree'},
        {label: 'Format', value: 'PDF and editable files'},
        {label: 'Includes', value: 'Templates and frameworks'},
      ],
      cta: {rowLabel: 'Buy', label: 'Get the package', href: '#contact', opensContact: true},
    },
    overview: {
      heading: 'Write about the work as clearly as you draw it',
      body: [
        'Architects are trained to draw and schooled in how buildings go together. Almost nobody is taught to write about what they have made. The result is a profession fluent in one language and hesitant in another, producing project descriptions that read like planning statements and competition texts that give a jury nothing to hold on to.',
        'This package closes that gap with working documents rather than advice. It gives you the structures behind a project description, a competition narrative, a practice profile and a client-facing summary, each stripped back to the decisions that actually matter and each ready to be filled in with your own work.',
        'The frameworks are deliberately plain. They ask what the project is for, who it is being explained to, and what a reader needs to understand first. Answer those honestly and the writing follows. Skip them and no amount of adjectives will save the paragraph.',
        'Everything is editable and yours to keep. Use the templates as they are for a deadline this week, or take them apart and build a house style on top of them.',
      ],
      image: {path: '/assets/photos/lifestyle/lifestyle-03.jpg', alt: 'Working drawings and notes on a studio desk'},
    },
    whatYouGet: {
      heading: 'What is included',
      body: [
        'The package is organised around the four documents a practice writes most often. Each comes with a completed worked example, a blank template, and a short set of notes explaining why the structure is shaped the way it is.',
        'Project descriptions are the workhorse. They appear on your site, in awards submissions, and in every enquiry a prospective client sends. The template separates the brief, the constraint, the move and the outcome, so a reader gets the idea before they get the detail.',
        'Competition narratives are a different problem. A jury reads dozens in an afternoon and remembers the ones with a single legible argument. The framework here makes you name that argument on the first line and defend it for the rest of the page.',
      ],
      modules: [
        {name: 'One', text: 'Project descriptions'},
        {name: 'Two', text: 'Competition narratives'},
        {name: 'Three', text: 'Practice profiles'},
        {name: 'Four', text: 'Client summaries'},
      ],
      image: {path: '/assets/photos/lifestyle/lifestyle-06.jpg', alt: 'An architect talking through a drawing on screen'},
    },
  },
  {
    slug: 'book',
    sortOrder: 3,
    title: 'Architectural Influence',
    card: {
      image: {path: '/assets/photos/lifestyle/lifestyle-10.jpg', alt: 'Architectural Influence'},
      kind: 'Book',
      meta: 'Hardcover',
      text: 'A precedent analysis of the 21 creators shaping how architecture is seen, shared and understood online',
      button: 'Buy the Book',
    },
    header: {
      image: {path: '/assets/photos/lifestyle/lifestyle-10.jpg'},
      lead: 'A precedent analysis of the top 21 social media creators in the architecture profession, across the globe',
      tags: ['Hardcover', 'RIBA Publishing', '224 pages'],
    },
    details: {
      metaRows: [
        {label: 'Author', value: 'Thomas Rowntree'},
        {label: 'Publisher', value: 'RIBA Publishing'},
        {label: 'Format', value: 'Hardcover, 224pp'},
      ],
      cta: {rowLabel: 'Order', label: 'Buy the book', href: '#contact', opensContact: true},
    },
    overview: {
      heading: 'How architecture travels beyond the building',
      body: [
        'Architecture has always depended on being seen. Drawings, photographs and journals carried the discipline further than any building could reach on its own. What has changed is who does the carrying. A generation of architects, students and designers now publishes directly, and in doing so has rebuilt the route between the profession and everyone outside it.',
        'This book studies that shift as a subject worth taking seriously. It is not a manual for growing an account, and it is not a complaint about the state of the discipline. It is a precedent analysis, in the way an architect would read a set of buildings: what was attempted, what was made, and what it produced.',
        'Twenty-one creators were selected across thirteen countries, from independent practitioners to studios with global reach. Each was examined for method rather than metrics — how the work is framed, what is left out, which audience it assumes, and where the ideas actually land.',
        'What emerges is a set of deliberate strategies. The creators who built something durable did not do it by accident, and the patterns behind their work are legible, transferable, and available to anyone willing to look at them closely.',
      ],
      image: {path: '/assets/photos/thumbnails/thumb-01.jpg'},
    },
    whatYouGet: {
      heading: 'Inside the book',
      body: [
        'The book opens with the case for treating architectural content as a discipline rather than a distraction. It sets out why visibility has become part of practice, and why the profession has been slow to study it.',
        'The central section is the atlas. Twenty-one creator profiles, each mapped to a city and read against the same set of questions. Instagram, TikTok, YouTube and LinkedIn are treated as distinct instruments rather than interchangeable channels, because each rewards a different kind of thinking.',
        'A chapter on method follows. It covers how a body of work is framed for an audience that has no obligation to care, how a position is held across years rather than posts, and how the work of building an audience feeds back into the architecture itself.',
        'The closing section turns outward. Practices, schools and institutions are given a way to read what the creators have built and to decide, deliberately, how they want to appear in the same space.',
      ],
    },
    atlas: {
      image: {
        path: '/assets/graphics/atlas-map.png',
        alt: 'World map plotting the twenty-one architecture creators studied in Architectural Influence',
      },
      caption: 'Twenty-one creators, mapped across thirteen countries — from Vancouver and Bogotá to London, Jaipur and Sydney.',
      primaryButton: {label: 'Explore Influence', href: '/influence'},
      secondaryButton: {label: 'Back to Shop', href: '/shop'},
    },
  },
  {
    slug: 'course-sketchbook',
    sortOrder: 4,
    title: 'An Architect’s Digital Sketchbook',
    card: {
      image: {path: '/assets/photos/products/sketchbook.jpg', alt: 'An Architect’s Digital Sketchbook with Morpholio Trace'},
      kind: 'Guide',
      meta: 'Free PDF',
      text: 'A step-by-step guide to sketching in Morpholio Trace — layering, photomontage and portfolio-ready output, with Hamza Shaikh',
      button: 'View Guide',
    },
    header: {
      image: {path: '/assets/photos/products/sketchbook.jpg'},
      lead: 'Sketch, layer and compose on an iPad in Morpholio Trace, ready for the portfolio',
      tags: ['Free', 'PDF guide', 'iPad'],
    },
    details: {
      metaRows: [
        {label: 'With', value: 'Thomas Rowntree and Hamza Shaikh'},
        {label: 'Format', value: 'PDF download'},
        {label: 'Price', value: 'Free'},
      ],
      cta: {
        rowLabel: 'Get it',
        label: 'Download the PDF',
        href: 'https://www.tomrowstudios.com/product-page/morpholio-trace-digital-sketchbook',
        opensContact: false,
      },
    },
    overview: {
      heading: 'Six tips for sketching digitally',
      body: [
        'A step-by-step tutorial on creating digital sketches quickly and easily. The PDF covers how to layer your sketches and compose them as photomontage, ready to include in your portfolios.',
        'Digital sketching is usually taught as a software problem, which is why so much of it looks like software. This guide treats it as a drawing problem that happens to use a tablet: what you trace, what you leave out, and how much of the underlay should still be visible when you are finished.',
        'Made with Hamza Shaikh, it works through six tips in order, each one building on the file you already have open. No project setup, no long preamble, nothing you cannot try on the sketch in front of you this afternoon.',
      ],
      image: {path: '/assets/photos/lifestyle/lifestyle-04.jpg', alt: 'Sketching over a drawing in the studio'},
    },
    whatYouGet: {
      heading: 'What it covers',
      body: [
        'The guide runs from a blank Trace file to a finished photomontage. It assumes you can hold a stylus and nothing else, and it stops short of anything you would not actually use on a live project.',
        'Layering is the part most people skip and then regret. Keeping the underlay, the line work and the tone on separate layers is what lets you throw away a bad pass without redrawing the good one, and it is what makes the sketch usable at portfolio scale later.',
        'Photomontage closes the guide. Dropping a sketch back over a site photograph is the fastest way to test whether a proposal reads at all, and it produces the image that ends up on the page.',
      ],
      modules: [
        {name: 'One', text: 'Setting up the sheet'},
        {name: 'Two', text: 'Line weight and layering'},
        {name: 'Three', text: 'Tone and shadow'},
        {name: 'Four', text: 'Photomontage for the portfolio'},
      ],
      image: {path: '/assets/photos/lifestyle/lifestyle-09.jpg', alt: 'A drawing pinned up in the studio'},
    },
  },
]

// The old singleton page documents these items replace; left for a human to delete
const OLD_PAGE_IDS = ['bookPage', 'productPage', 'courseCommunicationPage', 'courseSketchbookPage']

const key = () => randomBytes(6).toString('hex')

/** One paragraph as a Portable Text block (plain text; the pages had no strong or em) */
const block = (text: string) => ({
  _type: 'block',
  _key: key(),
  style: 'normal',
  markDefs: [],
  children: [{_type: 'span', _key: key(), text, marks: []}],
})

const withKey = <T extends object>(value: T) => ({_key: key(), ...value})

async function uploadImage(image: Picture) {
  const file = path.join(publicDir, image.path)
  const asset = await client.assets.upload('image', fs.createReadStream(file), {
    filename: path.basename(file),
  })
  return {
    _type: 'image',
    asset: {_type: 'reference', _ref: asset._id},
    ...(image.alt ? {alt: image.alt} : {}),
  }
}

async function seed(item: Item) {
  const id = `shopItem-${item.slug}`
  const existing = await client.fetch<string | null>('*[_id == $id][0]._id', {id})
  if (existing) {
    console.log(`kept ${id}`)
    return
  }

  let images = 0
  const picture = async (image: Picture | undefined) => {
    if (!image) return undefined
    images += 1
    return uploadImage(image)
  }

  const doc = {
    _id: id,
    _type: 'shopItem',
    title: item.title,
    slug: {_type: 'slug', current: item.slug},
    sortOrder: item.sortOrder,
    card: {...item.card, image: await picture(item.card.image)},
    header: {...item.header, image: await picture(item.header.image)},
    details: {
      metaRows: item.details.metaRows.map(withKey),
      cta: item.details.cta,
    },
    overview: {
      heading: item.overview.heading,
      body: item.overview.body.map(block),
      ...(item.overview.image ? {image: await picture(item.overview.image)} : {}),
    },
    whatYouGet: {
      heading: item.whatYouGet.heading,
      body: item.whatYouGet.body.map(block),
      ...(item.whatYouGet.modules ? {modules: item.whatYouGet.modules.map(withKey)} : {}),
      ...(item.whatYouGet.image ? {image: await picture(item.whatYouGet.image)} : {}),
    },
    ...(item.atlas ? {atlas: {...item.atlas, image: await picture(item.atlas.image)}} : {}),
  }

  await client.createIfNotExists(doc)
  console.log(`created ${id}, ${images} images`)
}

async function main() {
  for (const item of ITEMS) await seed(item)

  console.log('')
  console.log('Not deleted (delete them by hand once the site no longer reads them):')
  for (const id of OLD_PAGE_IDS) console.log(`  ${id}, live-${id}, drafts.${id}`)
}

main().catch((error: Error) => {
  console.error('ERR', error.message)
  process.exit(1)
})

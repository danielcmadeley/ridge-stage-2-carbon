// Ridge submission template — Typst recreation of public/R_260527_N21.docx
// Assets are loaded from public/ridge-template/assets/ via mapShadow (/ridge/*).

#let ridge-dark = rgb("#003723")
#let ridge-mid = rgb("#005032")
#let ridge-magenta = rgb("#C6128F")
#let ridge-muted = luma(140)

#let submission-name = [Submission Name]
#let client-name = [Client Name]
#let document-date = [Date]

#let placeholder-body = [
  Body text style Lesciis ut optatume corrupt atissed que es magnis aut
  plictatibus. Pliqui blaci blabor sequia natibus alibustis atem fugitae stibus
  modis qui omnim quam ullaudam inullupta que velest faceatius eumquunt et re
  res arcia nobiscius.
]

#let lorem-short = [
  Olum re, que non ratem aut volor autempe rsperese none suntorepel iuntisquid
  endi ium rectust as vellati dolupti issequa tissit et facearunda solum es
  maione consequ idebitaqui alit aut omnia quatius vel ent.
]

#let ridge-img(path, ..args) = image(path, ..args)

#let address-block(title, org, ..lines) = {
  text(weight: "bold", fill: ridge-dark)[#title]
  v(0.4em)
  org
  v(0.3em)
  for line in lines.pos() {
    line
    v(0.15em)
  }
}

#let cv-page(
  name,
  title,
  qualifications,
  profile,
  role,
  added-value,
  ..experiences,
) = {
  grid(
    columns: (32%, 1fr),
    gutter: 16pt,
    align: (left, left),
    {
      ridge-img("/ridge/image7.png", width: 100%)
      v(1em)
      text(size: 16pt, weight: "bold")[#name]
      v(0.3em)
      text(weight: "bold", fill: ridge-mid)[#title]
      v(0.5em)
      text(size: 9pt, weight: "bold")[Qualifications]
      qualifications
      v(0.8em)
      text(size: 9pt)[M: 00000 000 000 \ E: #raw("name@ridge.co.uk")]
    },
    {
      text(weight: "bold", fill: ridge-mid)[Profile]
      v(0.3em)
      profile
      v(0.8em)
      text(weight: "bold", fill: ridge-mid)[Role]
      v(0.3em)
      role
      v(0.8em)
      text(weight: "bold", fill: ridge-mid)[Added value]
      v(0.3em)
      added-value
      v(0.8em)
      text(weight: "bold", fill: ridge-mid)[Relevant Experience]
      v(0.3em)
      for experience in experiences.pos() {
        experience
        v(0.5em)
      }
    },
  )
}

#let experience-entry(client, project, description) = [
  *#client – #project* \
  #description
]

#let project-page(
  layout-image,
  quote: none,
  services: none,
  summary: none,
  role: none,
  added-value: none,
  stats: (),
  subheading: none,
  subheading-body: none,
) = {
  if quote != none {
    text(size: 14pt, style: "italic", fill: ridge-magenta)[#quote]
    v(1em)
  }

  grid(
    columns: (42%, 1fr),
    gutter: 18pt,
    {
      ridge-img(layout-image, width: 100%)
    },
    {
      if services != none {
        text(weight: "bold", fill: ridge-mid)[Services]
        v(0.3em)
        services
        v(0.8em)
      }

      text(weight: "bold", fill: ridge-mid)[Summary]
      v(0.3em)
      summary
      v(0.8em)

      text(weight: "bold", fill: ridge-mid)[Our Role]
      v(0.3em)
      role
      v(0.8em)

      text(weight: "bold", fill: ridge-mid)[Added Value]
      v(0.3em)
      added-value

      if stats.len() > 0 {
        v(0.8em)
        grid(
          columns: (1fr,) * calc.min(stats.len(), 3),
          gutter: 12pt,
          ..stats.map(stat => [
            #align(center)[
              #text(size: 18pt, weight: "bold", fill: ridge-dark)[#stat.at(0)]
              #v(0.2em)
              #text(size: 8pt)[#stat.at(1)]
            ]
          ])
        )
      }

      if subheading != none {
        v(0.8em)
        text(weight: "bold", fill: ridge-mid)[#subheading]
        v(0.3em)
        subheading-body
      }
    },
  )
}

#let pen-portrait(name, qualifications, profile, experience) = box(
  width: 100%,
  stroke: (paint: ridge-mid.lighten(70%), thickness: 0.5pt),
  inset: 10pt,
  radius: 2pt,
)[
  #grid(
    columns: (28%, 1fr),
    gutter: 12pt,
    {
      ridge-img("/ridge/image8.png", width: 100%)
      v(0.4em)
      text(weight: "bold")[#name]
      v(0.2em)
      text(size: 9pt)[Qualifications: #qualifications]
    },
    {
      text(weight: "bold", fill: ridge-mid)[Profile]
      v(0.2em)
      profile
      v(0.4em)
      experience
    },
  )
]

#let ridge-header-bar() = box(
  width: 100%,
  fill: ridge-dark,
  inset: (x: 0.8em, y: 0.45em),
)[
  #grid(
    columns: (1fr, 1fr),
    text(size: 11pt, weight: "bold", fill: white)[#submission-name],
    align(right)[
      #text(size: 11pt, weight: "bold", fill: white)[#client-name]
    ],
  )
]

// --- Document setup ---

#set page(
  paper: "a4",
  margin: (top: 2.2cm, bottom: 2cm, left: 2cm, right: 2cm),
  fill: white,
  header: context {
    if counter(page).get().first() > 2 {
      ridge-header-bar()
    }
  },
  footer: context {
    if counter(page).get().first() > 2 {
      align(right)[
        #text(size: 9pt, fill: ridge-muted)[#counter(page).display()]
      ]
    }
  },
)

#set text(size: 10pt)
#set par(justify: true, leading: 0.65em, spacing: 0.65em)
#set heading(numbering: "1.1.1")
#show heading.where(level: 1): set text(size: 14pt, weight: "bold", fill: ridge-dark)
#show heading.where(level: 2): set text(size: 12pt, weight: "bold", fill: ridge-mid)
#show heading.where(level: 3): set text(size: 11pt, weight: "bold", fill: ridge-mid)
#show link: set text(fill: ridge-dark)

// --- Page 1: Cover with sidebar ---

#page(margin: 0pt)[
  #grid(
    columns: (7.5cm, 1fr),
    gutter: 0pt,
    {
      ridge-img("/ridge/image3.png", width: 100%, height: 29.7cm, fit: "cover")
    },
    [
      #v(2cm)
      #pad(left: 1.5cm, right: 1.5cm)[
        #ridge-img("/ridge/image1.png", width: 60%)
        #v(4cm)
        #text(size: 22pt, weight: "bold", fill: ridge-dark)[#submission-name]
        #v(0.8em)
        #text(size: 18pt)[#client-name]
      ]
    ],
  )
]

#pagebreak()

// --- Page 2: Full cover ---

#grid(
  columns: (1fr, 1fr),
  gutter: 24pt,
  align: (left, left),
  {
    box(
      width: 100%,
      height: 4cm,
      stroke: (paint: ridge-muted, thickness: 0.5pt, dash: "dashed"),
    )[
      #align(center + horizon)[
        #text(size: 10pt, fill: ridge-muted)[CLIENT LOGO HERE]
      ]
    ]
    v(2em)
    text(size: 20pt, weight: "bold", fill: ridge-dark)[#submission-name]
    v(0.5em)
    text(size: 16pt)[#client-name]
    v(1em)
    text(weight: "bold")[#document-date]
  },
  {
    address-block(
      [Prepared for],
      [*#client-name*],
      [Address line 1],
      [address line 2],
      [address line 3],
      [address line 4],
      [Postcode],
    )
    v(1.5em)
    address-block(
      [Prepared by],
      [*Ridge and Partners LLP*],
      [Address line 1],
      [address line 2],
      [address line 3],
      [address line 4],
      [Postcode],
      [Tel: Telephone],
    )
    v(1.5em)
    text(weight: "bold", fill: ridge-dark)[Contact]
    v(0.3em)
    [Forename Surname \
    Ridge Job Title \
    Email \
    Mobile]
  },
)

#pagebreak()

// --- Page 3: Contents ---

= Contents

#outline(
  title: none,
  indent: auto,
  depth: 3,
)

#pagebreak()

// --- Page 4: Introduction ---

= Introduction

Unnumbered heading styles can be applied rather than numbered if required with contents page adapted to suit.

== Heading 2

Normal

=== Heading 3

Normal

- List bullet
  - List bullet 2
    - List bullet 3

#set enum(numbering: "1.a.i.")
+ List number
+ List number 2
+ List number 3

#heading(numbering: none, level: 1)[Heading 1 unnumbered]

Normal

#heading(numbering: none, level: 2)[Heading 2 unnumbered]

Normal

#heading(numbering: none, level: 3)[Heading 3 unnumbered]

Normal

#pagebreak()

// --- Page 5: Operations Management ---

= Operations Management

We have carefully selected a team of well-qualified and experienced professionals to deliver our services to #client-name. We recognise that continuity of the people that work on a project is important; as such we will provide a team that will deliver the services for you carrying knowledge and understanding and thereby reducing the learning curve and focusing on solutions and adding value.

It is a fundamental principle of our Practice that an Equity Partner stays involved with every project, thus giving you direct contact with an owner of our business who cares about your programme and individual projects. [Equity Partner - Name A], an Equity Partner of Ridge, will take overall responsibility for Ridge in providing services to #client-name for [service] for the [project / at location].

[Name B] will manage the day-to-day aspects of this project and will be responsible for managing the technical content. [Name B] will take responsibility for providing our services in true collaboration with your other consultants. Recognising the need for a primary point of contact, [Name B] will be the key contact.

We have shown below our selected team of well-qualified and experienced professionals who would deliver our [service] services to this appointment. Profiles of the key personnel are included within the following pages in the form of CV's:

#table(
  columns: (1fr, 1fr, 1fr),
  stroke: 0.5pt + ridge-dark,
  inset: 8pt,
  align: (left, left, left),
  table.header(
    [*Name*], [*Position*], [*Qualifications*],
  ),
  [Text], [Text], [Text],
  [Text], [Text], [Text],
  [Text], [Text], [Text],
)

#pagebreak()

// --- Page 6: Proposed Team ---

== Proposed Team

#align(center)[
  #ridge-img("/ridge/image5.png", width: 85%)
]

#v(1.5em)

#grid(
  columns: (1fr, 1fr),
  gutter: 16pt,
  {
    text(weight: "bold", fill: ridge-dark)[Providing added value with:]
    v(0.3em)
    text(size: 9pt)[
      Architecture, Building Services Cost Management, Building Services Engineering,
      Building Surveying, Civil Engineering, Cost Management, Digital Engineering (BIM),
      Expert Witness and Advisory Services, Geo-Environmental Consultancy, Geospatial
      Services, Health and Safety, Lighting Design, Project Management, Property Consultancy,
      Structural Engineering, Sustainability and ESG, Town and Country Planning, Transport Planning
    ]
  },
  {
    text(weight: "bold", fill: ridge-dark)[Offices in:]
    v(0.3em)
    text(size: 9pt)[
      Birmingham, Bristol, Cambridge, Cardiff, Cheltenham, Leeds, Liverpool, London,
      Manchester, Newcastle, Oxford, Plymouth, Reading, Whitehaven, Winchester
    ]
    v(0.8em)
    text(size: 20pt, weight: "bold", fill: ridge-dark)[1500+]
    text(size: 9pt)[ Total staff]
  },
)

#pagebreak()

// --- Page 7: Team CVs intro ---

= Team CVs

Insert team CVs here from Open Asset or use the sample layouts within this template.

== Heading 2

#pagebreak()

// --- Pages 8–10: CV layouts ---

#cv-page(
  [Name Name],
  [Job Title / Position],
  [Qualifications],
  [Employee CV profile],
  [Bespoke detail here],
  [
    - Bespoke detail here
  ],
  experience-entry([Client name], [Project name], [Project role, Role / Project Description]),
  experience-entry([Client name], [Project name], [Project role, Role / Project Description]),
  experience-entry([Client name], [Project name], [Project role, Role / Project Description]),
  experience-entry([Client name], [Project name], [Project role, Role / Project Description]),
  experience-entry([Client name], [Project name], [Project role, Role / Project Description]),
)

#pagebreak()

#cv-page(
  [Name Name],
  [Job Title / Position],
  [Qualifications],
  [[Profile]],
  [[Bespoke detail here]],
  [
    - Bespoke detail here
  ],
  experience-entry([Client name], [Project name], [Project role, Role / Project Description]),
  experience-entry([Client name], [Project name], [Project role, Role / Project Description]),
  experience-entry([Client name], [Project name], [Project role, Role / Project Description]),
  experience-entry([Client name], [Project name], [Project role, Role / Project Description]),
  experience-entry([Client name], [Project name], [Project role, Role / Project Description]),
  experience-entry([Client name], [Project name], [Project role, Role / Project Description]),
)

#pagebreak()

#cv-page(
  [Name Name],
  [Job Title / Position],
  [Qualifications],
  placeholder-body,
  placeholder-body,
  [
    - Bespoke detail here
    - Added value
    - Added value
    - Added value
    - Added value
  ],
  experience-entry([Client name], [Project name], placeholder-body),
  experience-entry([Client name], [Project name], placeholder-body),
  experience-entry([Client name], [Project name], placeholder-body),
  experience-entry([Client name], [Project name], placeholder-body),
  experience-entry([Client name], [Project name], placeholder-body),
  experience-entry([Client name], [Project name], placeholder-body),
)

#pagebreak()

// --- Page 11: Pen portraits ---

#heading(level: 2, numbering: none)[Title of pen portraits / Subject Matter Experts]

#v(0.5em)

#pen-portrait(
  [Name Name],
  [Qualifications],
  [Employee CV profile],
  experience-entry([Client name], [Project name], [
    Project role, Role / Project Description Pliqui blaci blabor sequia natibus alibustis atem
    fugitae stibus modis qui omnim quam ullaudam inullupta que velest faceatius eumquunt et re
    res arcia nobiscius.
  ]),
)

#v(0.8em)

#pen-portrait(
  [Name Name],
  [Qualifications],
  [Employee CV profile],
  experience-entry([Client name], [Project name], [
    Project role, Role / Project Description Pliqui blaci blabor sequia natibus alibustis atem
    fugitae stibus modis qui omnim quam ullaudam inullupta que velest faceatius eumquunt et re
    res arcia nobiscius.
  ]),
)

#v(0.8em)

#pen-portrait(
  [Name Name],
  [Qualifications],
  [Employee CV profile],
  experience-entry([Client name], [Project name], [
    Project role, Role / Project Description Pliqui blaci blabor sequia natibus alibustis atem
    fugitae stibus modis qui omnim quam ullaudam inullupta que velest faceatius eumquunt et re
    res arcia nobiscius.
  ]),
)

#v(0.8em)

#pen-portrait(
  [Name Name],
  [Qualifications],
  [Employee CV profile],
  experience-entry([Client name], [Project name], [
    Project role, Role / Project Description Pliqui blaci blabor sequia natibus alibustis atem
    fugitae stibus modis qui omnim quam ullaudam inulluptam que velest faceatius eumquunt et re
    res arcia nobiscius.
  ]),
)

#pagebreak()

// --- Page 12: Relevant Experience intro ---

= Relevant Experience

Insert project case studies from Open Asset or use the sample layouts within this template.

#pagebreak()

// --- Pages 13–16: Project case studies ---

#project-page(
  "/ridge/image9.png",
  quote: ["Quote to go here." liqui blaci blabor sequia natibus alibustis atem fugitae stibus modis qui omnim quam ullaudam inullupta que velest faceatius eumquunt et re res arcia nobiscius.],
  services: [
    [Discipline Keywords], [Discipline Keywords], [Discipline Keywords],
    [Discipline Keywords], [Discipline Keywords], [Discipline Keywords], [Discipline Keywords].
  ],
  summary: placeholder-body,
  role: lorem-short + [ estrumquo volore delest latum vendis arum ide evelique quias cum erum sitibus.],
  added-value: lorem-short + [
    estrumquo volore delest latum vendis arum ide evelique quias cum erum sitibus.
  ],
)

#pagebreak()

#project-page(
  "/ridge/image10.png",
  summary: placeholder-body,
  role: lorem-short,
  added-value: lorem-short + [
    estrumquo volore delest latum vendis arum ide evelique quias cum erum sitibus
  ],
)

#pagebreak()

#project-page(
  "/ridge/image11.png",
  summary: placeholder-body,
  role: lorem-short,
  added-value: lorem-short + [
    estrumquo volore delest latum vendis arum ide evelique quias cum erum sitibus.
  ],
  stats: (
    ([Stat %], [Stat sub text]),
  ),
  subheading: [Subheading],
  subheading-body: lorem-short + [
    estrumquo volore delest latum vendis arum ide evelique quias cum erum sitibus.
  ],
)

#pagebreak()

#project-page(
  "/ridge/image12.png",
  summary: placeholder-body,
  role: lorem-short,
  added-value: lorem-short + [
    estrumquo volore delest latum vendis arum ide evelique quias cum erum sitibus.
  ],
  stats: (
    ([Stat %], [Stat sub text]),
    ([Stat %], [Stat sub text]),
    ([Stat %], [Stat sub text]),
  ),
  subheading: [Subheading],
  subheading-body: lorem-short,
)

#pagebreak()

// --- Page 17: Other relevant experience ---

#heading(level: 1, numbering: none)[Other relevant experience]

#v(0.5em)

#for i in range(5) [
  #text(weight: "bold", fill: ridge-dark)[Project Title]
  #v(0.2em)
  #placeholder-body
  #v(0.8em)
]

#pagebreak()

// --- Page 18: Back cover ---

#page(margin: 0pt)[
  #ridge-img("/ridge/image13.jpeg", width: 100%, height: 29.7cm, fit: "cover")
]

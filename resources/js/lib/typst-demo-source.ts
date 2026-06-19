export const defaultTypstSource = `#set page(margin: 1.5cm)
#set text(size: 11pt)

#import "@preview/cetz:0.5.2"
#import "@preview/cetz-plot:0.1.4": plot, chart

= Typst WASM Demo

Charts rendered with #link("https://typst.app/universe/package/cetz")[CeTZ] and cetz-plot, compiled entirely in your browser.

== Equations

$ E = m c^2 $

$ integral_0^infinity e^(-x^2) dif x = sqrt(pi)/2 $

$ nabla dot bold(E) = rho/epsilon_0 $

$ sum_(n=1)^oo 1/n^2 = pi^2/6 $

$ e^(i pi) + 1 = 0 $

== Pie Chart

#cetz.canvas({
  chart.piechart(
    (
      ([Research], 28),
      ([Design], 22),
      ([Development], 35),
      ([Testing], 15),
    ),
    value-key: 1,
    label-key: 0,
    radius: 3,
    stroke: none,
    slice-style: (red, blue, green, orange),
    outer-label: (content: "%", radius: 115%),
  )
})

== Bar Chart

#cetz.canvas({
  import cetz.draw: *
  chart.barchart(
    (
      ([Q1], 12),
      ([Q2], 19),
      ([Q3], 15),
      ([Q4], 22),
    ),
    size: (8, 4),
    label-key: 0,
    value-key: 1,
    x-label: "Quarter",
    y-label: "Revenue (k)",
  )
})

== Scatter Plot

#cetz.canvas({
  import cetz.draw: *
  plot.plot(
    size: (8, 5),
    x-label: "Hours studied",
    y-label: "Exam score",
    {
      plot.add(
        ((1, 62), (2, 68), (3, 71), (4, 76), (5, 80), (6, 85), (7, 88), (8, 92)),
        mark: "o",
        label: "Students",
        style: (stroke: none, fill: blue),
      )
    },
  )
})
`;

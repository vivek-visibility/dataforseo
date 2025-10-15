export const OnPageBenchmarkSchema = {
  weights: {
    high: 0.7,
    medium: 0.2,
    low: 0.1,
  },
  metrics: {
    title_length: {
      label: 'Title length',
      healthy_min: 30,
      healthy_max: 60,
      weight: 'low',
    },
    meta_description_length: {
      label: 'Meta description length',
      healthy_min: 70,
      healthy_max: 160,
      weight: 'low',
    },
    h1_present: {
      label: 'H1 tag present',
      expected: true,
      weight: 'medium',
    },
    content_word_count: {
      label: 'Content word count',
      healthy_min: 300,
      healthy_max: 1500,
      weight: 'high',
    },
    internal_links: {
      label: 'Internal links count',
      healthy_min: 3,
      healthy_max: 15,
      weight: 'medium',
    },
  },
};

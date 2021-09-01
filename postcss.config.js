const svelteExtractor = ( content ) => {
  const regExp = new RegExp(/[A-Za-z0-9-_:/]+/g)
  const matchedTokens = []
  let match = regExp.exec(content)

  while (match) {
    if (match[0].startsWith('class:')) {
      matchedTokens.push(match[0].substring(6))
    } else {
      matchedTokens.push(match[0])
    }
    match = regExp.exec(content)
  }
  return matchedTokens
}

const purgecss = require('@fullhuman/postcss-purgecss')({
  content: ['./src/**/*.svelte', './src/**/*.html'],
  whitelistPatterns: [/svelte-/],
  defaultExtractor: svelteExtractor,
})

module.exports = {
  plugins: [
    require('tailwindcss'),
    require('autoprefixer'),
    ...(!process.env.ROLLUP_WATCH ? [purgecss] : [])
  ]
}

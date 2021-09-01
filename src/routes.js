import Home from './pages/Home.svelte'
import Error from './pages/Error.svelte'

export default [
  {
    path: '/',
    component: Home
  },
  {
    path: '*',
    component: Error
  }
]
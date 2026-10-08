import { lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppShell } from './layouts/AppShell'
import Home from './pages/Home'
const Search = lazy(() => import('./pages/Search'))
const Library = lazy(() => import('./pages/Library'))
const Playlist = lazy(() => import('./pages/Playlist'))
const Artist = lazy(() => import('./pages/Artist'))
const Collection = lazy(() => import('./pages/Collection'))
const Settings = lazy(() => import('./pages/Settings'))
const NotFound = lazy(() => import('./pages/NotFound'))
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Home />} />
            <Route path="search" element={<Search />} />
            <Route path="library" element={<Library />} />
            <Route path="playlist/:id" element={<Playlist />} />
            <Route path="artist/:id" element={<Artist />} />
            <Route path="collection/:id" element={<Collection />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

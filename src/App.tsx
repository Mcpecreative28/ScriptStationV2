import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Home from './pages/Home';
import Listing from './pages/Listing';
import ResourceDetail from './pages/ResourceDetail';
import Upload from './pages/Upload';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Placeholder from './pages/Placeholder';

import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route
          path="/scripts"
          element={<Listing kind="Script" />}
        />

        <Route
          path="/snippets"
          element={<Listing kind="Snippet" />}
        />

        <Route
          path="/baileys"
          element={<Listing kind="Baileys" />}
        />

        <Route
          path="/scripts/:id"
          element={<ResourceDetail />}
        />

        <Route
          path="/scripts/upload"
          element={<Upload />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/search"
          element={<Placeholder title="Search" />}
        />

        <Route
          path="/rooms"
          element={<Placeholder title="Public Rooms" />}
        />

        <Route
          path="/marketplace"
          element={<Placeholder title="Marketplace" />}
        />

        <Route
          path="/admin"
          element={<Placeholder title="Admin Panel" />}
        />

        <Route
          path="*"
          element={<Placeholder title="404 — Page not found" />}
        />
      </Routes>
    </BrowserRouter>
  );
}
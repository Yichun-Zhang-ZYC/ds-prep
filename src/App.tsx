import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { FullPageSpinner, RequireAuth } from './auth/RequireAuth';
import { ToastProvider } from './components/Toast';
import { I18nProvider } from './i18n/I18nProvider';
import { DashboardPage } from './routes/DashboardPage';
import { LoginPage } from './routes/LoginPage';
import { NotAuthorizedPage } from './routes/NotAuthorizedPage';
import { SectionPage } from './routes/SectionPage';

// Lessons pull in Markdown, KaTeX and CodeMirror; keep them out of the dashboard bundle (DESIGN.md §11).
const LessonPage = lazy(() => import('./routes/LessonPage').then(m => ({ default: m.LessonPage })));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/** HashRouter because GitHub Pages has no SPA fallback (DESIGN.md §2). */
export default function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <AuthProvider>
          <HashRouter>
            <ScrollToTop />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/not-authorized" element={<NotAuthorizedPage />} />
              <Route element={<RequireAuth />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/section/:sectionId" element={<SectionPage />} />
                <Route
                  path="/lesson/:sectionId/:lessonId"
                  element={
                    <Suspense fallback={<FullPageSpinner />}>
                      <LessonPage />
                    </Suspense>
                  }
                />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        </AuthProvider>
      </ToastProvider>
    </I18nProvider>
  );
}

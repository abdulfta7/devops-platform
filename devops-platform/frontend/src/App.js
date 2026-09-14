import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Tracks from './pages/Tracks';
import Roadmap from './pages/Roadmap';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import TaskPage from './pages/TaskPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Checkout from './pages/Checkout';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import CourseManager from './pages/CourseManager';
import AdminLive from './pages/AdminLive';
import LiveCourses from './pages/LiveCourses';
import LiveCourse from './pages/LiveCourse';
import Articles from './pages/Articles';
import ArticleDetail from './pages/ArticleDetail';
import CreateArticle from './pages/CreateArticle';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';

function AppRoutes() {
  const { loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <>
      {/* CourseManager & AdminLive have their own layout — hide Navbar */}
      {!location.pathname.startsWith('/admin/courses') && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tracks" element={<Tracks />} />
        <Route path="/tracks/:slug" element={<Roadmap />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/courses/:slug" element={<CourseDetail />} />
        <Route path="/tasks/:id" element={<TaskPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/checkout/:paymentId" element={<Checkout />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/courses/:courseId/manage" element={<CourseManager />} />
        <Route path="/admin/live" element={<AdminLive />} />
        <Route path="/live" element={<LiveCourses />} />
        <Route path="/live/:slug" element={<LiveCourse />} />
        <Route path="/articles" element={<Articles />} />
        <Route path="/articles/create" element={<CreateArticle />} />
        <Route path="/articles/:id" element={<ArticleDetail />} />
        <Route path="*" element={
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>404</div>
            <h2 style={{ marginBottom: '8px' }}>Page Not Found</h2>
            <a href="/" style={{ color: 'var(--accent-blue)' }}>← Go Home</a>
          </div>
        } />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

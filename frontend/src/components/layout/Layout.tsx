import { useAuth } from '@/hooks/useAuth';
import Navbar from './Navbar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto py-6">
        {children}
      </main>
    </div>
  );
};

export default Layout;
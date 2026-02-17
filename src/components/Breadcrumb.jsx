import { Link, useLocation } from 'react-router-dom';
import { useMemo } from 'react';

const Breadcrumb = () => {
  const location = useLocation();
  
  // Define breadcrumb paths - use useMemo to ensure fresh calculation on route change
  const breadcrumbs = useMemo(() => {
    const path = location.pathname;
    
    if (path === '/gardenia' || path.startsWith('/gardenia')) {
      return [
        { label: 'Gardenia', path: '/gardenia', isActive: true }
      ];
    }
    
    if (path === '/spare-parts') {
      return [
        { label: 'Spare Parts', path: '/spare-parts' },
        { label: 'Create DR', path: '/spare-parts', isActive: true }
      ];
    }
    
    if (path === '/spare-parts/dashboard') {
      return [
        { label: 'Spare Parts', path: '/spare-parts' },
        { label: 'Dashboard', path: '/spare-parts/dashboard', isActive: true }
      ];
    }
    
    if (path === '/billing') {
      return [
        { label: 'Spare Parts', path: '/spare-parts' },
        { label: 'Billing', path: '/billing', isActive: true }
      ];
    }
    
    if (path === '/cykris') {
      return [
        { label: 'Cykris', path: '/cykris' },
        { label: 'Create DR', path: '/cykris', isActive: true }
      ];
    }
    
    if (path === '/cykris-billing') {
      return [
        { label: 'Cykris', path: '/cykris' },
        { label: 'Billing', path: '/cykris-billing', isActive: true }
      ];
    }
    
    return [];
  }, [location.pathname]);
  
  if (breadcrumbs.length === 0) {
    return null;
  }
  
  return (
    <nav className="bg-white border-b border-gray-200 px-8 py-3" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <li key={`${crumb.path}-${index}`} className="flex items-center">
            {index > 0 && (
              <svg
                className="w-4 h-4 text-gray-400 mx-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
            {crumb.isActive ? (
              <span className="text-gray-700 font-medium">{crumb.label}</span>
            ) : (
              <Link
                to={crumb.path}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumb;

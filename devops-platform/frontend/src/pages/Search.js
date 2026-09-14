import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import SearchBar from '../components/SearchBar';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    track: searchParams.get('track') || '',
    level: searchParams.get('level') || '',
    price_range: searchParams.get('price_range') || '',
    sort: searchParams.get('sort') || ''
  });

  const query = searchParams.get('q') || '';

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query) params.append('q', query);
        if (filters.track) params.append('track', filters.track);
        if (filters.level) params.append('level', filters.level);
        if (filters.price_range) params.append('price_range', filters.price_range);
        if (filters.sort) params.append('sort', filters.sort);

        const response = await api.get(`/search/courses?${params.toString()}`);
        setCourses(response.data.courses);
      } catch (error) {
        console.error('Error searching courses:', error);
      } finally {
        setLoading(false);
      }
    };

    if (query) {
      fetchResults();
    }
  }, [query, filters]);

  const handleSearch = (searchQuery) => {
    setSearchParams({ q: searchQuery });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
      return newParams;
    });
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '36px', marginBottom: '16px', color: '#1a202c' }}>
          Search Courses
        </h1>
        <SearchBar onSearch={handleSearch} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '32px' }}>
        {/* Filters Sidebar */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', height: 'fit-content' }}>
          <h3 style={{ marginBottom: '20px', color: '#2d3748' }}>Filters</h3>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#4a5568' }}>
              Level
            </label>
            <select
              value={filters.level}
              onChange={(e) => handleFilterChange('level', e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#4a5568' }}>
              Price
            </label>
            <select
              value={filters.price_range}
              onChange={(e) => handleFilterChange('price_range', e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="">All Prices</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#4a5568' }}>
              Sort By
            </label>
            <select
              value={filters.sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="">Default</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>

        {/* Results */}
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '18px', color: '#718096' }}>Loading...</div>
            </div>
          ) : courses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
              {query ? 'No courses found for your search.' : 'Enter a search term to find courses.'}
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '20px', color: '#718096' }}>
                Found {courses.length} courses
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                {courses.map((course) => (
                  <div
                    key={course.id}
                    style={{
                      background: 'white',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                      transition: 'transform 0.2s'
                    }}
                  >
                    {course.thumbnail && (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        style={{ width: '100%', height: '180px', objectFit: 'cover' }}
                      />
                    )}
                    <div style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: course.level === 'beginner' ? '#c6f6d5' :
                                         course.level === 'intermediate' ? '#fefcbf' : '#fed7d7',
                          color: course.level === 'beginner' ? '#276749' :
                                 course.level === 'intermediate' ? '#975a16' : '#9b2c2c'
                        }}>
                          {course.level}
                        </span>
                        {course.is_free && (
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            backgroundColor: '#c6f6d5',
                            color: '#276749'
                          }}>
                            Free
                          </span>
                        )}
                      </div>
                      <h3 style={{ fontSize: '18px', marginBottom: '8px', color: '#1a202c' }}>
                        {course.title}
                      </h3>
                      <p style={{ fontSize: '14px', color: '#718096', marginBottom: '12px', lineHeight: '1.5' }}>
                        {course.description}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: '#f6ad55' }}>★</span>
                          <span style={{ fontSize: '14px', color: '#4a5568' }}>
                            {course.avg_rating.toFixed(1)} ({course.review_count})
                          </span>
                        </div>
                        <span style={{ fontSize: '18px', fontWeight: '700', color: '#3b82f6' }}>
                          ${course.is_free ? '0' : course.price}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Search;

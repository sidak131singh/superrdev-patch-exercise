import { useState, useEffect, useRef } from 'react';
import { fetchTasks } from '../api';

export function useTasks(query, status, page, pageSize) {
  const [tasks, setTasks] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const prevQuery = useRef(query);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const queryChanged = query !== prevQuery.current;
    prevQuery.current = query;

    // Only debounce when the search query is being typed.
    // Page and status changes are deliberate clicks — fire immediately.
    const delay = queryChanged ? 300 : 0;

    const timer = setTimeout(() => {
      fetchTasks({ query, status, page, pageSize })
        .then((data) => {
          setTasks(data.items);
          setTotal(data.total);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }, delay);

    return () => clearTimeout(timer);
  }, [query, status, page, pageSize]);

  return { tasks, total, loading, error };
}

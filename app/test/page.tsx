"use client";
import { useState } from 'react';
import { getAllEmployeesAction } from '@/app/actions/add_action_action';

export default function TestPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    setLoading(true);
    try {
      const data = await getAllEmployeesAction();
      setResult({ status: "Success", count: data.length, data });
    } catch (err: any) {
      setResult({ status: "Error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', direction: 'ltr' }}>
      <h1>Supabase Connection Test</h1>
      <button 
        onClick={runTest}
        style={{ padding: '10px 20px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '5px' }}
      >
        {loading ? "Testing..." : "Run Connection Test"}
      </button>

      {result && (
        <pre style={{ marginTop: '20px', background: '#f4f4f4', padding: '15px', borderRadius: '5px', overflow: 'auto' }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
"use client";
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'; // 🚀 استدعاء المحرك غير التزامني
import { get, set, del } from 'idb-keyval'; // IndexedDB

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst',
      staleTime: 1000 * 60 * 60, // ساعة واحدة
      gcTime: 1000 * 60 * 60 * 24, // 24 ساعة
    },
    mutations: {
      networkMode: 'offlineFirst', // العمليات تُحفظ في الطابور إذا فُقد الاتصال
    },
  },
});

// 🛡️ إعداد الخزنة المحلية (Async Persister) لتتوافق مع IndexedDB
const persister = createAsyncStoragePersister({
  storage: {
    getItem: async (key) => await get(key),
    setItem: async (key, value) => await set(key, value),
    removeItem: async (key) => await del(key),
  },
});

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      {children}
    </PersistQueryClientProvider>
  );
}
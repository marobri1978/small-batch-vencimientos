import { HashRouter, Link, Route, Routes } from 'react-router-dom';
import type { ISODate } from './domain/dates';
import { StoreProvider, TodayProvider } from './state/store';
import { Layout } from './components/Layout';
import { EmptyState } from './components/ui';
import { AlertsScreen } from './screens/AlertsScreen';
import { DocumentsScreen } from './screens/DocumentsScreen';
import { DocumentDetailScreen } from './screens/DocumentDetailScreen';
import { CounterpartiesScreen } from './screens/CounterpartiesScreen';
import { CounterpartyDetailScreen } from './screens/CounterpartyDetailScreen';
import { AgendaScreen } from './screens/AgendaScreen';

export function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<AlertsScreen />} />
        <Route path="/documentos" element={<DocumentsScreen />} />
        <Route path="/documentos/:id" element={<DocumentDetailScreen />} />
        <Route path="/contrapartes" element={<CounterpartiesScreen />} />
        <Route path="/contrapartes/:id" element={<CounterpartyDetailScreen />} />
        <Route path="/agenda" element={<AgendaScreen />} />
        <Route path="*" element={<EmptyState title="Esta página no existe" text="Volvé a los avisos de hoy." action={<Link to="/" className="btn-primario">Ir a avisos</Link>} />} />
      </Routes>
    </Layout>
  );
}

/** `fixedToday` solo lo usan las pruebas. La app normal usa la fecha actual del negocio. */
export default function App({ fixedToday }: { fixedToday?: ISODate }) {
  return (
    <TodayProvider fixedToday={fixedToday}>
      <StoreProvider>
        <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppRoutes />
        </HashRouter>
      </StoreProvider>
    </TodayProvider>
  );
}

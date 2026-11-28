import { Route, Routes } from 'react-router-dom'
import ArchivePage from '@/pages/ArchivePage'
import CustomerPage from '@/pages/CustomerPage'
import CustomersPage from '@/pages/CustomersPage'
import DayPage from '@/pages/DayPage'
import OrderFormPage from '@/pages/OrderFormPage'
import ProductPage from '@/pages/ProductPage'
import ProductsPage from '@/pages/ProductsPage'
import TicketsPage from '@/pages/TicketsPage'

/** Screen routes. The shell (header, navigation) is rendered by App. */
export function AppRoutes() {
  return (
    <Routes>
      <Route index element={<DayPage />} />
      <Route path="day/:date" element={<DayPage />} />
      <Route path="orders/new" element={<OrderFormPage />} />
      <Route path="orders/:id" element={<OrderFormPage />} />
      <Route path="archive" element={<ArchivePage />} />
      <Route path="tickets" element={<TicketsPage />} />
      <Route path="customers" element={<CustomersPage />} />
      <Route path="customers/:id" element={<CustomerPage />} />
      <Route path="products" element={<ProductsPage />} />
      <Route path="products/new" element={<ProductPage />} />
      <Route path="products/:id" element={<ProductPage />} />
    </Routes>
  )
}

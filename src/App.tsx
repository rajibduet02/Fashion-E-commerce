import { useEffect } from "react";
import { BrowserRouter, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { Toasts } from "./components/Ui";
import { Account } from "./pages/Account";
import { Admin } from "./pages/Admin";
import { CartPage } from "./pages/Cart";
import { Care } from "./pages/Care";
import { Checkout } from "./pages/Checkout";
import { Collection } from "./pages/Collection";
import { Home } from "./pages/Home";
import { Mirror } from "./pages/Mirror";
import { ProductPage } from "./pages/Product";
import { NotFound, SearchPage, WishlistPage } from "./pages/Search";
import { Trial } from "./pages/Trial";
import { TryOn } from "./pages/TryOn";
import { Wardrobe } from "./pages/Wardrobe";
import { StoreProvider } from "./store";

function ScrollTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const target = document.querySelector(hash);
      if (target) {
        target.scrollIntoView();
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

function Storefront() {
  return (
    <>
      <a className="skip" href="#content">
        Skip to content
      </a>
      <Header />
      <main id="content">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

export function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <ScrollTop />
        <Routes>
          <Route path="/admin" element={<Admin />} />
          <Route element={<Storefront />}>
            <Route path="/" element={<Home />} />
            <Route path="/men" element={<Collection mode="men" />} />
            <Route path="/women" element={<Collection mode="women" />} />
            <Route path="/new" element={<Collection mode="new" />} />
            <Route path="/trending" element={<Collection mode="trending" />} />
            <Route path="/edit/:season" element={<Collection mode="season" />} />
            <Route path="/product/:id" element={<ProductPage />} />
            <Route path="/try-on" element={<TryOn />} />
            <Route path="/mirror" element={<Mirror />} />
            <Route path="/trial" element={<Trial />} />
            <Route path="/wardrobe" element={<Wardrobe />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/account" element={<Account />} />
            <Route path="/account/:tab" element={<Account />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/care" element={<Care />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        <Toasts />
      </BrowserRouter>
    </StoreProvider>
  );
}

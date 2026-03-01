/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, ShoppingBag, MapPin, ShieldCheck, ArrowRight, Star, Loader2, XCircle, Search, Share2, Copy, Check, ExternalLink } from "lucide-react";
import { supabase } from "./supabase";

const ICON_URL = "https://raw.githubusercontent.com/deivid22srk/Compra-Facil-web/refs/heads/main/Round%20Photo_Mar012026_093934.png";
const SCREENSHOT_1 = "https://raw.githubusercontent.com/deivid22srk/Compra-Facil-web/refs/heads/main/Screenshot_20260301-093823.CompraFacil.png";
const SCREENSHOT_2 = "https://raw.githubusercontent.com/deivid22srk/Compra-Facil-web/refs/heads/main/Screenshot_20260301-093825.CompraFacil.png";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category_id?: string;
}

export default function App() {
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  
  // View state
  const [view, setView] = useState<'landing' | 'products'>('landing');
  
  // Product state
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Handle Hash Routing for Product Links
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/product/')) {
        const productId = hash.replace('#/product/', '');
        setView('products'); // Switch to products view if a product link is accessed
        fetchSingleProduct(productId);
      } else if (hash === '#products') {
        setView('products');
      } else if (hash === '' || hash === '#home') {
        setView('landing');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Check on mount

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleDownload = async () => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadError(null);

    try {
      // 1. Fetch download URL from Supabase
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'download_url')
        .single();

      if (error) throw error;
      
      const downloadUrl = typeof data.value === 'string' ? data.value : data.value.toString();

      try {
        // 2. Start download with progress
        const response = await fetch(downloadUrl, { mode: 'cors' });
        
        if (!response.ok) throw new Error('Falha ao iniciar download via fetch');

        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        
        const reader = response.body?.getReader();
        if (!reader) throw new Error('Não foi possível ler o arquivo');

        let loaded = 0;
        const chunks = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          chunks.push(value);
          loaded += value.length;
          
          if (total > 0) {
            setDownloadProgress(Math.round((loaded / total) * 100));
          }
        }

        // 3. Trigger browser download
        const blob = new Blob(chunks);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'CompraFacil.apk'; 
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (fetchErr) {
        console.warn('Fetch failed (likely CORS), falling back to direct download:', fetchErr);
        // Fallback: Direct download if fetch fails (CORS issue)
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.target = '_blank';
        a.download = 'CompraFacil.apk';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Show a temporary "Starting download" state since we can't track progress
        setDownloadProgress(100);
      }

    } catch (err: any) {
      console.error('Download error:', err);
      setDownloadError('Erro ao baixar o app. Verifique sua conexão.');
    } finally {
      // Keep progress at 100 for a moment before closing
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
      }, 1000);
    }
  };

  const fetchSingleProduct = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      if (data) setSelectedProduct(data);
    } catch (err) {
      console.error("Error fetching product:", err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const handleShare = (product: Product) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}#/product/${product.id}`;
    
    if (navigator.share) {
      navigator.share({
        title: `CompraFacil - ${product.name}`,
        text: `Confira este produto no CompraFacil: ${product.name}`,
        url: shareUrl,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareUrl);
      setCopiedId(product.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const openProduct = (product: Product) => {
    window.location.hash = `#/product/${product.id}`;
    setSelectedProduct(product);
  };

  const closeProduct = () => {
    window.location.hash = '#products';
    setSelectedProduct(null);
  };

  const goToProducts = () => {
    window.location.hash = '#products';
    setView('products');
    window.scrollTo(0, 0);
  };

  const goToLanding = () => {
    window.location.hash = '#home';
    setView('landing');
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 selection:bg-emerald-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass py-4 px-6 md:px-12 flex justify-between items-center">
        <div className="flex items-center gap-3 cursor-pointer" onClick={goToLanding}>
          <img src={ICON_URL} alt="CompraFacil Icon" className="w-10 h-10 rounded-xl" referrerPolicy="no-referrer" />
          <span className="text-xl font-bold tracking-tight">CompraFacil</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
          <button onClick={goToLanding} className={`hover:text-white transition-colors ${view === 'landing' ? 'text-white' : ''}`}>Início</button>
          <button onClick={goToProducts} className={`hover:text-white transition-colors ${view === 'products' ? 'text-white' : ''}`}>Produtos</button>
          {view === 'landing' && (
            <>
              <a href="#features" className="hover:text-white transition-colors">Recursos</a>
              <a href="#screenshots" className="hover:text-white transition-colors">App</a>
            </>
          )}
        </div>
        <button 
          onClick={handleDownload}
          disabled={isDownloading}
          className="bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-2 rounded-full text-sm font-bold transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isDownloading ? <Loader2 className="animate-spin" size={16} /> : null}
          {isDownloading ? 'Baixando...' : 'Baixar Agora'}
        </button>
      </nav>

      <AnimatePresence mode="wait">
        {view === 'landing' ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.4 }}
          >
            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-6 md:px-12 overflow-hidden">
              {/* Background Glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full -z-10" />
              
              <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-6">
                    <MapPin size={14} /> Riacho dos Barreiros
                  </div>
                  <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] mb-6 tracking-tighter">
                    Suas compras locais, <span className="text-emerald-400">mais fáceis</span> do que nunca.
                  </h1>
                  <p className="text-lg text-zinc-400 mb-8 max-w-lg leading-relaxed">
                    O CompraFacil conecta você aos melhores produtos do Sítio Riacho dos Barreiros e região. Qualidade, frescor e praticidade na palma da sua mão.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <button 
                      onClick={handleDownload}
                      disabled={isDownloading}
                      className="flex items-center gap-3 bg-emerald-500 text-black px-8 py-4 rounded-2xl font-bold hover:bg-emerald-400 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDownloading ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
                      {isDownloading ? `Baixando ${downloadProgress}%` : 'Instalar App'}
                      {!isDownloading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                    </button>
                    <button 
                      onClick={goToProducts}
                      className="flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 text-white px-8 py-4 rounded-2xl font-bold hover:bg-white/10 transition-all group"
                    >
                      <ShoppingBag size={20} />
                      Ver Produtos
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="relative flex justify-center"
                >
                  <div className="relative z-10 w-[280px] md:w-[320px] aspect-[9/19] rounded-[3rem] border-8 border-zinc-800 overflow-hidden shadow-2xl shadow-emerald-500/20">
                    <img src={SCREENSHOT_1} alt="App Screenshot" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  {/* Decorative elements */}
                  <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-emerald-500/20 blur-3xl rounded-full -z-10" />
                  <div className="absolute top-20 -left-20 w-48 h-48 bg-cyan-500/10 blur-3xl rounded-full -z-10" />
                </motion.div>
              </div>
            </section>

            {/* Featured Products Preview Grid */}
            <section className="py-24 px-6 md:px-12">
              <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-end mb-12">
                  <div>
                    <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Destaques da Região</h2>
                    <p className="text-zinc-400">Uma prévia do que você encontra no nosso app.</p>
                  </div>
                  <button onClick={goToProducts} className="hidden md:flex items-center gap-2 text-emerald-400 font-bold hover:underline">
                    Ver catálogo completo <ArrowRight size={18} />
                  </button>
                </div>

                {loadingProducts ? (
                  <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-emerald-500" size={40} />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                    {products.slice(0, 4).map((product) => (
                      <motion.div 
                        key={product.id}
                        whileHover={{ y: -5 }}
                        className="glass rounded-2xl md:rounded-[2rem] overflow-hidden group cursor-pointer"
                        onClick={() => openProduct(product)}
                      >
                        <div className="aspect-square overflow-hidden relative">
                          <img 
                            src={product.image_url || "https://picsum.photos/seed/product/400/400"} 
                            alt={product.name} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="p-4 md:p-6">
                          <h3 className="font-bold text-sm md:text-lg mb-1 line-clamp-1 group-hover:text-emerald-400 transition-colors">{product.name}</h3>
                          <p className="text-emerald-400 font-bold text-base md:text-xl">
                            R$ {Number(product.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
                
                <button 
                  onClick={goToProducts}
                  className="w-full mt-8 md:hidden flex items-center justify-center gap-2 bg-white/5 border border-white/10 py-4 rounded-2xl font-bold"
                >
                  Ver todos os produtos <ArrowRight size={18} />
                </button>
              </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 px-6 md:px-12 bg-zinc-900/30">
              <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                  <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Por que usar o CompraFacil?</h2>
                  <p className="text-zinc-400 max-w-2xl mx-auto">Desenvolvido para fortalecer o comércio local e facilitar a vida de quem mora ou visita o Riacho dos Barreiros.</p>
                </div>
                
                <div className="grid md:grid-cols-3 gap-8">
                  {[
                    {
                      icon: <ShoppingBag className="text-emerald-400" size={32} />,
                      title: "Variedade Local",
                      desc: "Acesse produtos frescos e artesanais produzidos diretamente na nossa região."
                    },
                    {
                      icon: <MapPin className="text-emerald-400" size={32} />,
                      title: "Entrega Rápida",
                      desc: "Logística otimizada para o Sítio Riacho dos Barreiros e arredores."
                    },
                    {
                      icon: <ShieldCheck className="text-emerald-400" size={32} />,
                      title: "Compra Segura",
                      desc: "Pagamentos facilitados e garantia de recebimento do seu pedido."
                    }
                  ].map((feature, idx) => (
                    <motion.div 
                      key={idx}
                      whileHover={{ y: -10 }}
                      className="p-8 rounded-3xl glass hover:bg-white/10 transition-all"
                    >
                      <div className="mb-6">{feature.icon}</div>
                      <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                      <p className="text-zinc-400 text-sm leading-relaxed">{feature.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>

            {/* Screenshots Section */}
            <section id="screenshots" className="py-24 px-6 md:px-12 overflow-hidden">
              <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                  <div className="max-w-xl">
                    <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Interface Intuitiva</h2>
                    <p className="text-zinc-400">Fizemos o app pensando na simplicidade. Com poucos toques, você encontra o que precisa e finaliza sua compra.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                      <ArrowRight size={20} className="rotate-180" />
                    </div>
                    <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                      <ArrowRight size={20} />
                    </div>
                  </div>
                </div>

                <div className="flex gap-8 overflow-x-auto pb-12 no-scrollbar">
                  {[SCREENSHOT_1, SCREENSHOT_2, SCREENSHOT_1].map((src, i) => (
                    <motion.div 
                      key={i}
                      className="min-w-[280px] md:min-w-[320px] aspect-[9/19] rounded-[2.5rem] border-4 border-zinc-800 overflow-hidden flex-shrink-0"
                    >
                      <img src={src} alt={`Screenshot ${i}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 px-6 md:px-12">
              <div className="max-w-5xl mx-auto rounded-[3rem] bg-gradient-to-br from-emerald-600 to-emerald-900 p-12 md:p-20 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                <div className="relative z-10">
                  <h2 className="text-4xl md:text-6xl font-bold mb-8 tracking-tight">Pronto para começar?</h2>
                  <p className="text-emerald-100 text-lg mb-12 max-w-2xl mx-auto">
                    Junte-se a centenas de moradores do Riacho dos Barreiros que já estão economizando tempo com o CompraFacil.
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <button className="bg-black text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-zinc-900 transition-all flex items-center justify-center gap-3">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Play Store" className="h-8" referrerPolicy="no-referrer" />
                    </button>
                    <button className="bg-white text-black px-10 py-5 rounded-2xl font-bold text-lg hover:bg-zinc-100 transition-all flex items-center justify-center gap-3">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="App Store" className="h-8" referrerPolicy="no-referrer" />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </motion.div>
        ) : (
          <motion.div
            key="products"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="pt-32 pb-20 px-6 md:px-12"
          >
            {/* Products Screen */}
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-16">
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold mb-2 cursor-pointer hover:underline" onClick={goToLanding}>
                    <ArrowRight size={16} className="rotate-180" /> Voltar para o Início
                  </div>
                  <h2 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight">Catálogo de Produtos</h2>
                  <p className="text-zinc-400">Encontre os melhores itens da nossa região.</p>
                </div>
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                  <input 
                    type="text" 
                    placeholder="Pesquisar produtos..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
              </div>

              {loadingProducts ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4">
                  <Loader2 className="animate-spin text-emerald-500" size={48} />
                  <p className="text-zinc-500 text-lg">Carregando catálogo...</p>
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                  {filteredProducts.map((product) => (
                    <motion.div 
                      key={product.id}
                      layoutId={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass rounded-2xl md:rounded-[2rem] overflow-hidden group cursor-pointer flex flex-col h-full"
                      onClick={() => openProduct(product)}
                    >
                      <div className="aspect-square overflow-hidden relative">
                        <img 
                          src={product.image_url || "https://picsum.photos/seed/product/400/400"} 
                          alt={product.name} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShare(product);
                          }}
                          className="absolute top-2 right-2 md:top-4 md:right-4 w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-emerald-500 transition-colors"
                        >
                          {copiedId === product.id ? <Check size={16} /> : <Share2 size={16} />}
                        </button>
                      </div>
                      <div className="p-4 md:p-6 flex flex-col flex-grow">
                        <h3 className="font-bold text-sm md:text-xl mb-1 md:mb-2 group-hover:text-emerald-400 transition-colors line-clamp-1">{product.name}</h3>
                        <p className="hidden md:block text-zinc-500 text-sm mb-4 line-clamp-2 flex-grow">{product.description}</p>
                        <div className="flex justify-between items-center mt-auto pt-2 md:pt-4 border-t border-white/5">
                          <span className="text-emerald-400 font-bold text-base md:text-2xl">
                            R$ {Number(product.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-black transition-colors">
                            <ArrowRight size={16} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-40 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                  <ShoppingBag className="mx-auto text-zinc-700 mb-4" size={64} />
                  <p className="text-zinc-500 text-xl">Nenhum produto encontrado para "{searchQuery}"</p>
                  <button onClick={() => setSearchQuery("")} className="mt-4 text-emerald-400 hover:underline">Limpar pesquisa</button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeProduct}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              layoutId={selectedProduct.id}
              className="relative w-full max-w-4xl bg-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 flex flex-col md:flex-row"
            >
              <button 
                onClick={closeProduct}
                className="absolute top-6 right-6 z-10 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <XCircle size={24} />
              </button>

              <div className="w-full md:w-1/2 aspect-square md:aspect-auto">
                <img 
                  src={selectedProduct.image_url || "https://picsum.photos/seed/product/800/800"} 
                  alt={selectedProduct.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
                <div className="mb-8">
                  <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">{selectedProduct.name}</h2>
                  <p className="text-zinc-400 leading-relaxed mb-6">
                    {selectedProduct.description || "Sem descrição disponível para este produto."}
                  </p>
                  <div className="text-4xl font-bold text-emerald-400">
                    R$ {Number(selectedProduct.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <button 
                    onClick={handleDownload}
                    className="w-full py-4 bg-emerald-500 text-black rounded-2xl font-bold text-lg hover:bg-emerald-400 transition-all flex items-center justify-center gap-3"
                  >
                    <ShoppingBag size={20} />
                    Comprar no App
                  </button>
                  <button 
                    onClick={() => handleShare(selectedProduct)}
                    className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                  >
                    {copiedId === selectedProduct.id ? <Check size={20} /> : <Share2 size={20} />}
                    {copiedId === selectedProduct.id ? 'Link Copiado!' : 'Compartilhar Produto'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="py-12 px-6 md:px-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3 cursor-pointer" onClick={goToLanding}>
            <img src={ICON_URL} alt="CompraFacil Icon" className="w-8 h-8 rounded-lg" referrerPolicy="no-referrer" />
            <span className="font-bold tracking-tight">CompraFacil</span>
          </div>
          <p className="text-zinc-500 text-sm">
            © 2026 CompraFacil. Atendendo Riacho dos Barreiros e Região.
          </p>
          <div className="flex gap-6 text-zinc-400 text-sm">
            <button onClick={goToLanding} className="hover:text-white transition-colors">Início</button>
            <button onClick={goToProducts} className="hover:text-white transition-colors">Produtos</button>
            <a href="#" className="hover:text-white transition-colors">Privacidade</a>
          </div>
        </div>
      </footer>
      {/* Download Progress Overlay */}
      <AnimatePresence>
        {isDownloading && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md"
          >
            <div className="glass p-6 rounded-3xl shadow-2xl border-emerald-500/20">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                    <Download className="text-emerald-400" size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Baixando CompraFacil</h4>
                    <p className="text-xs text-zinc-500">Aguarde a conclusão...</p>
                  </div>
                </div>
                <span className="text-emerald-400 font-bold text-sm">{downloadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Toast */}
      <AnimatePresence>
        {downloadError && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md"
          >
            <div className="bg-red-500/10 border border-red-500/20 backdrop-blur-xl p-4 rounded-2xl flex items-center gap-3">
              <XCircle className="text-red-500" size={20} />
              <p className="text-sm font-medium text-red-200">{downloadError}</p>
              <button onClick={() => setDownloadError(null)} className="ml-auto text-red-500 hover:text-red-400">
                <ArrowRight size={16} className="rotate-45" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

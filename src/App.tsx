import React, { useState, useEffect, useMemo } from 'react';
import { 
  PlusCircle, 
  BarChart3, 
  Users, 
  Package, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  Camera, 
  QrCode, 
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Calendar,
  MapPin,
  User,
  Phone,
  ArrowRight
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDoc, 
  setDoc,
  orderBy,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { 
  signInAnonymously, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { QRCodeSVG } from 'qrcode.react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

import { db, auth } from './firebase';
import { Farmer, VegetableItem, Sale } from './types';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'danger' }) => {
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
    secondary: 'bg-amber-500 text-white hover:bg-amber-600',
    outline: 'border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  };

  return (
    <button 
      className={cn(
        'w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const Input = ({ label, icon: Icon, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; icon?: any }) => (
  <div className="space-y-2">
    <label className="text-sm font-bold text-emerald-800 uppercase tracking-wider ml-1">{label}</label>
    <div className="relative">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 w-5 h-5" />}
      <input 
        className={cn(
          "w-full bg-white border-2 border-emerald-100 rounded-2xl py-4 pr-4 focus:border-emerald-500 focus:ring-0 outline-none transition-all text-lg",
          Icon ? "pl-12" : "pl-4"
        )}
        {...props} 
      />
    </div>
  </div>
);

const Card = ({ children, className, ...props }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("bg-white rounded-3xl p-6 shadow-sm border border-emerald-50", className)} {...props}>
    {children}
  </div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<'login' | 'register' | 'dashboard' | 'addItem' | 'profit' | 'customers' | 'myItems' | 'settings' | 'qrView' | 'customerView'>('login');
  const [selectedItem, setSelectedItem] = useState<VegetableItem | null>(null);
  
  // Data states
  const [items, setItems] = useState<VegetableItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  // Check for QR scan URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const itemId = params.get('itemId');
    if (itemId) {
      fetchItemForCustomer(itemId);
    }
  }, []);

  const fetchItemForCustomer = async (id: string) => {
    try {
      const docRef = doc(db, 'items', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSelectedItem({ id: docSnap.id, ...docSnap.data() } as VegetableItem);
        setScreen('customerView');
      }
    } catch (e) {
      console.error("Error fetching item:", e);
    }
  };

  useEffect(() => {
    const savedFarmerId = localStorage.getItem('farmerId');
    if (savedFarmerId) {
      const fetchFarmer = async () => {
        const farmerDoc = await getDoc(doc(db, 'farmers', savedFarmerId));
        if (farmerDoc.exists()) {
          setFarmer({ id: farmerDoc.id, ...farmerDoc.data() } as Farmer);
          setScreen('dashboard');
        } else {
          localStorage.removeItem('farmerId');
          setScreen('login');
        }
        setLoading(false);
      };
      fetchFarmer();
    } else {
      setLoading(false);
    }
  }, []);

  // Listen for items and sales
  useEffect(() => {
    if (!farmer) return;

    const itemsQuery = query(collection(db, 'items'), where('farmerId', '==', farmer.id), orderBy('createdAt', 'desc'));
    const itemsUnsub = onSnapshot(itemsQuery, (snapshot) => {
      setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as VegetableItem)));
    }, (err) => console.error("Items list error:", err));

    const salesQuery = query(collection(db, 'sales'), where('farmerId', '==', farmer.id), orderBy('date', 'desc'));
    const salesUnsub = onSnapshot(salesQuery, (snapshot) => {
      setSales(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Sale)));
    }, (err) => console.error("Sales list error:", err));

    return () => {
      itemsUnsub();
      salesUnsub();
    };
  }, [farmer]);

  const handleLogin = async (mobile: string, pin: string) => {
    try {
      const q = query(collection(db, 'farmers'), where('mobile', '==', mobile), where('pin', '==', pin));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const farmerData = querySnapshot.docs[0].data();
        const farmerId = querySnapshot.docs[0].id;
        
        localStorage.setItem('farmerId', farmerId);
        setFarmer({ id: farmerId, ...farmerData } as Farmer);
        setScreen('dashboard');
      } else {
        alert("Invalid Mobile Number or PIN");
      }
    } catch (e) {
      console.error(e);
      alert("Login failed");
    }
  };

  const handleRegister = async (name: string, mobile: string, pin: string) => {
    try {
      const q = query(collection(db, 'farmers'), where('mobile', '==', mobile));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        alert("This mobile number is already registered. Please login.");
        setScreen('login');
        return;
      }

      const farmerId = mobile.trim();
      const farmerData = {
        name: name.trim(),
        mobile: mobile.trim(),
        pin: pin.trim(),
        createdAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'farmers', farmerId), farmerData);
      
      // Save to local storage for session persistence
      localStorage.setItem('farmerId', farmerId);
      
      // Update state
      setFarmer({ id: farmerId, ...farmerData } as Farmer);
      
      // Show success message
      alert("Registration Successful! Welcome to Farmer Direct Market.");
      
      // Redirect to dashboard
      setScreen('dashboard');
    } catch (e) {
      console.error("Registration Error:", e);
      alert("Registration failed. Please try again.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('farmerId');
    setFarmer(null);
    setScreen('login');
  };

  if (loading) return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-emerald-50 text-slate-900 font-sans pb-10">
      <div className="max-w-md mx-auto min-h-screen flex flex-col">
        
        {/* Header */}
        {screen !== 'login' && screen !== 'register' && (
          <header className="p-6 flex items-center justify-between bg-white shadow-sm sticky top-0 z-10">
            <div className="flex items-center gap-3">
              {screen !== 'dashboard' && screen !== 'customerView' && (
                <button onClick={() => setScreen('dashboard')} className="p-2 hover:bg-emerald-50 rounded-full">
                  <ChevronLeft className="w-6 h-6 text-emerald-700" />
                </button>
              )}
              <h1 className="text-xl font-black text-emerald-800 tracking-tight">
                {screen === 'dashboard' ? 'Farmer Direct' : 
                 screen === 'addItem' ? 'Add New Item' :
                 screen === 'profit' ? 'Profit Chart' :
                 screen === 'customers' ? 'My Customers' :
                 screen === 'myItems' ? 'My Harvest' :
                 screen === 'settings' ? 'Settings' :
                 screen === 'qrView' ? 'Item QR Code' :
                 screen === 'customerView' ? 'Vegetable Details' : ''}
              </h1>
            </div>
            {farmer && screen === 'dashboard' && (
              <div className="bg-emerald-100 p-2 rounded-full">
                <User className="w-5 h-5 text-emerald-700" />
              </div>
            )}
          </header>
        )}

        <main className="flex-1 p-6">
          <AnimatePresence mode="wait">
            {screen === 'login' && <LoginScreen onLogin={handleLogin} onGoToRegister={() => setScreen('register')} />}
            {screen === 'register' && <RegisterScreen onRegister={handleRegister} onGoToLogin={() => setScreen('login')} />}
            {screen === 'dashboard' && <Dashboard farmer={farmer!} onNavigate={setScreen} />}
            {screen === 'addItem' && <AddItemScreen farmer={farmer!} onComplete={() => setScreen('myItems')} />}
            {screen === 'myItems' && <MyItemsScreen items={items} onSelectItem={(item) => { setSelectedItem(item); setScreen('qrView'); }} />}
            {screen === 'qrView' && <QRViewScreen item={selectedItem!} farmer={farmer!} />}
            {screen === 'profit' && <ProfitScreen sales={sales} items={items} />}
            {screen === 'customers' && <CustomersScreen sales={sales} />}
            {screen === 'settings' && <SettingsScreen farmer={farmer!} onLogout={handleLogout} />}
            {screen === 'customerView' && <CustomerViewScreen item={selectedItem!} />}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// --- Screen Components ---

function LoginScreen({ onLogin, onGoToRegister }: { onLogin: (m: string, p: string) => void, onGoToRegister: () => void }) {
  const [mobile, setMobile] = useState('');
  const [pin, setPin] = useState('');

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8 pt-10">
      <div className="text-center space-y-2">
        <div className="w-24 h-24 bg-emerald-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-200 mb-6">
          <Package className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-4xl font-black text-emerald-900">Farmer Direct</h1>
        <p className="text-emerald-600 font-medium">Sell directly to your customers</p>
      </div>

      <Card className="space-y-6">
        <Input label="Mobile Number" icon={Phone} placeholder="Enter 10 digit number" type="tel" value={mobile} onChange={e => setMobile(e.target.value)} />
        <Input label="4-Digit PIN" icon={Settings} placeholder="Enter PIN" type="password" maxLength={4} value={pin} onChange={e => setPin(e.target.value)} />
        <Button onClick={() => onLogin(mobile, pin)}>Login Now</Button>
      </Card>

      <div className="text-center">
        <button onClick={onGoToRegister} className="text-emerald-700 font-bold hover:underline">
          New Farmer? Register Here
        </button>
      </div>
    </motion.div>
  );
}

function RegisterScreen({ onRegister, onGoToLogin }: { onRegister: (n: string, m: string, p: string) => void, onGoToLogin: () => void }) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const handleRegister = () => {
    if (pin !== confirmPin) return alert("PINs do not match");
    if (pin.length !== 4) return alert("PIN must be 4 digits");
    onRegister(name, mobile, pin);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-black text-emerald-900">Join the Market</h1>
        <p className="text-emerald-600">Start selling your harvest today</p>
      </div>

      <Card className="space-y-4">
        <Input label="Farmer Name" icon={User} placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} />
        <Input label="Mobile Number" icon={Phone} placeholder="10 digit number" type="tel" value={mobile} onChange={e => setMobile(e.target.value)} />
        <Input label="Create 4-Digit PIN" icon={Settings} placeholder="4 digits" type="password" maxLength={4} value={pin} onChange={e => setPin(e.target.value)} />
        <Input label="Confirm PIN" icon={CheckCircle2} placeholder="Repeat PIN" type="password" maxLength={4} value={confirmPin} onChange={e => setConfirmPin(e.target.value)} />
        <Button onClick={handleRegister}>Register Farmer</Button>
      </Card>

      <div className="text-center">
        <button onClick={onGoToLogin} className="text-emerald-700 font-bold hover:underline">
          Already have an account? Login
        </button>
      </div>
    </motion.div>
  );
}

function Dashboard({ farmer, onNavigate }: { farmer: Farmer, onNavigate: (s: any) => void }) {
  const menuItems = [
    { id: 'addItem', label: 'Add Item', icon: PlusCircle, color: 'bg-emerald-500' },
    { id: 'profit', label: 'Profit Chart', icon: BarChart3, color: 'bg-blue-500' },
    { id: 'customers', label: 'Customers', icon: Users, color: 'bg-amber-500' },
    { id: 'myItems', label: 'My Items', icon: Package, color: 'bg-purple-500' },
    { id: 'settings', label: 'Settings', icon: Settings, color: 'bg-slate-500' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="bg-emerald-600 rounded-3xl p-8 text-white shadow-lg shadow-emerald-100 relative overflow-hidden">
        <div className="relative z-10">
          <p className="opacity-80 font-medium">Welcome back,</p>
          <h2 className="text-3xl font-black">{farmer.name}</h2>
          <div className="mt-4 inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-sm font-bold backdrop-blur-sm">
            <MapPin className="w-4 h-4" />
            Active Seller
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className="bg-white p-6 rounded-3xl flex flex-col items-center justify-center gap-4 shadow-sm border border-emerald-50 hover:border-emerald-200 transition-all active:scale-95 group"
          >
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform", item.color)}>
              <item.icon className="w-7 h-7" />
            </div>
            <span className="font-black text-emerald-900">{item.label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function AddItemScreen({ farmer, onComplete }: { farmer: Farmer, onComplete: () => void }) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (generateQR = false) => {
    if (!name || !quantity || !price || !location) return alert("Please fill all fields");
    setSubmitting(true);
    try {
      const itemData = {
        farmerId: farmer.id,
        farmerName: farmer.name,
        name,
        quantity: Number(quantity),
        price: Number(price),
        cultivationDate: date,
        location,
        createdAt: new Date().toISOString(),
        soldCount: 0,
        photoUrl: `https://picsum.photos/seed/${name}/400/300` // Placeholder
      };
      await addDoc(collection(db, 'items'), itemData);
      onComplete();
    } catch (e) {
      console.error(e);
      alert("Failed to add item");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-20">
      <div className="bg-emerald-100 rounded-3xl p-10 flex flex-col items-center justify-center border-2 border-dashed border-emerald-300 text-emerald-700">
        <Camera className="w-12 h-12 mb-2" />
        <span className="font-bold">Upload Photo</span>
      </div>

      <Card className="space-y-4">
        <Input label="Vegetable Name" placeholder="e.g. Tomato, Potato" value={name} onChange={e => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Quantity (KG)" type="number" placeholder="0" value={quantity} onChange={e => setQuantity(e.target.value)} />
          <Input label="Price / KG" type="number" placeholder="₹" value={price} onChange={e => setPrice(e.target.value)} />
        </div>
        <Input label="Cultivation Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <Input label="Farm Location" icon={MapPin} placeholder="Village, District" value={location} onChange={e => setLocation(e.target.value)} />
      </Card>

      <div className="space-y-4">
        <Button onClick={() => handleSubmit(false)} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Item'}
        </Button>
        <Button variant="secondary" onClick={() => handleSubmit(true)} disabled={submitting}>
          <QrCode className="w-5 h-5" />
          Generate QR Code
        </Button>
      </div>
    </motion.div>
  );
}

function MyItemsScreen({ items, onSelectItem }: { items: VegetableItem[], onSelectItem: (i: VegetableItem) => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {items.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="font-bold">No items added yet</p>
        </div>
      ) : (
        items.map((item) => (
          <Card key={item.id} className="p-4 flex gap-4 items-center">
            <img src={item.photoUrl} alt={item.name} className="w-20 h-20 rounded-2xl object-cover bg-emerald-50" />
            <div className="flex-1">
              <h3 className="font-black text-lg text-emerald-900">{item.name}</h3>
              <div className="flex gap-4 text-sm font-bold text-slate-500">
                <span>{item.quantity} KG</span>
                <span>₹{item.price}/KG</span>
              </div>
            </div>
            <button onClick={() => onSelectItem(item)} className="bg-emerald-100 p-3 rounded-2xl text-emerald-700 hover:bg-emerald-200">
              <QrCode className="w-6 h-6" />
            </button>
          </Card>
        ))
      )}
    </motion.div>
  );
}

function QRViewScreen({ item, farmer }: { item: VegetableItem, farmer: Farmer }) {
  const qrUrl = `${window.location.origin}/?itemId=${item.id}`;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8 text-center">
      <Card className="p-10 flex flex-col items-center space-y-6">
        <div className="p-4 bg-white rounded-3xl shadow-inner border-4 border-emerald-50">
          <QRCodeSVG value={qrUrl} size={200} level="H" includeMargin />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-emerald-900">{item.name}</h2>
          <p className="text-slate-500 font-bold">Scan to view details & buy</p>
        </div>
      </Card>

      <div className="bg-white rounded-3xl p-6 text-left space-y-4 border border-emerald-50">
        <h3 className="font-black text-emerald-800 uppercase text-xs tracking-widest">QR Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-slate-400 font-bold">FARMER</p>
            <p className="font-black">{farmer.name}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-400 font-bold">LOCATION</p>
            <p className="font-black">{item.location}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-400 font-bold">HARVESTED</p>
            <p className="font-black">{format(new Date(item.cultivationDate), 'dd MMM yyyy')}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-400 font-bold">PRICE</p>
            <p className="font-black text-emerald-600">₹{item.price}/KG</p>
          </div>
        </div>
      </div>

      <Button onClick={() => window.print()} variant="outline">Print QR Code</Button>
    </motion.div>
  );
}

function ProfitScreen({ sales, items }: { sales: Sale[], items: VegetableItem[] }) {
  const totalEarnings = sales.reduce((acc, s) => acc + s.totalPrice, 0);
  const totalItemsSold = sales.reduce((acc, s) => acc + s.quantity, 0);

  // Group sales by month for the chart
  const chartData = useMemo(() => {
    const months: Record<string, number> = {};
    sales.forEach(s => {
      const month = format(new Date(s.date), 'MMM');
      months[month] = (months[month] || 0) + s.totalPrice;
    });
    return Object.entries(months).map(([name, profit]) => ({ name, profit }));
  }, [sales]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-emerald-600 text-white">
          <DollarSign className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-xs font-bold opacity-80">TOTAL EARNINGS</p>
          <p className="text-2xl font-black">₹{totalEarnings}</p>
        </Card>
        <Card className="bg-blue-600 text-white">
          <TrendingUp className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-xs font-bold opacity-80">ITEMS SOLD</p>
          <p className="text-2xl font-black">{totalItemsSold} KG</p>
        </Card>
      </div>

      <Card className="h-80">
        <h3 className="font-black text-emerald-900 mb-6">Monthly Profit Graph</h3>
        <ResponsiveContainer width="100%" height="80%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold', fill: '#64748b' }} />
            <YAxis hide />
            <Tooltip 
              cursor={{ fill: '#f8fafc' }} 
              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="profit" fill="#10b981" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <h3 className="font-black text-emerald-900 mb-4">Recent Sales</h3>
        <div className="space-y-4">
          {sales.slice(0, 5).map(sale => (
            <div key={sale.id} className="flex justify-between items-center border-b border-slate-50 pb-4 last:border-0">
              <div>
                <p className="font-black text-slate-800">{sale.customerName}</p>
                <p className="text-xs font-bold text-slate-400">{format(new Date(sale.date), 'dd MMM, HH:mm')}</p>
              </div>
              <p className="font-black text-emerald-600">+₹{sale.totalPrice}</p>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

function CustomersScreen({ sales }: { sales: Sale[] }) {
  // Unique customers
  const customers = useMemo(() => {
    const map = new Map();
    sales.forEach(s => {
      if (!map.has(s.customerMobile)) {
        map.set(s.customerMobile, {
          name: s.customerName,
          mobile: s.customerMobile,
          items: [],
          lastPurchase: s.date
        });
      }
      const c = map.get(s.customerMobile);
      c.items.push(s);
    });
    return Array.from(map.values());
  }, [sales]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {customers.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="font-bold">No customers yet</p>
        </div>
      ) : (
        customers.map((customer) => (
          <Card key={customer.mobile} className="space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-emerald-900">{customer.name}</h3>
                  <p className="text-sm font-bold text-slate-500">{customer.mobile}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-400 uppercase">Last Order</p>
                <p className="text-sm font-black">{format(new Date(customer.lastPurchase), 'dd MMM')}</p>
              </div>
            </div>
            <div className="bg-emerald-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-2">Purchased Items</p>
              <div className="flex flex-wrap gap-2">
                {customer.items.map((s: Sale) => (
                  <span key={s.id} className="bg-white px-3 py-1 rounded-full text-xs font-black shadow-sm">
                    {s.quantity}kg Veg
                  </span>
                ))}
              </div>
            </div>
          </Card>
        ))
      )}
    </motion.div>
  );
}

function SettingsScreen({ farmer, onLogout }: { farmer: Farmer, onLogout: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <Card className="flex flex-col items-center text-center space-y-4">
        <div className="w-24 h-24 bg-emerald-600 rounded-full flex items-center justify-center text-white text-4xl font-black">
          {farmer.name[0]}
        </div>
        <div>
          <h2 className="text-2xl font-black text-emerald-900">{farmer.name}</h2>
          <p className="text-slate-500 font-bold">{farmer.mobile}</p>
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <User className="w-6 h-6" />
            </div>
            <span className="font-black">Edit Profile</span>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-300" />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Phone className="w-6 h-6" />
            </div>
            <span className="font-black">Change Mobile</span>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-300" />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
              <Settings className="w-6 h-6" />
            </div>
            <span className="font-black">App Settings</span>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-300" />
        </Card>
      </div>

      <Button variant="danger" onClick={onLogout}>
        <LogOut className="w-5 h-5" />
        Logout Account
      </Button>

      <p className="text-center text-xs font-bold text-slate-400">Farmer Direct Market v1.0.0</p>
    </motion.div>
  );
}

function CustomerViewScreen({ item }: { item: VegetableItem }) {
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [buyQuantity, setBuyQuantity] = useState('1');
  const [purchased, setPurchased] = useState(false);
  const [buying, setBuying] = useState(false);

  const handleBuy = async () => {
    if (!customerName || !customerMobile) return alert("Please enter your details");
    setBuying(true);
    try {
      const saleData = {
        itemId: item.id,
        farmerId: item.farmerId,
        customerName,
        customerMobile,
        quantity: Number(buyQuantity),
        totalPrice: Number(buyQuantity) * item.price,
        date: new Date().toISOString()
      };
      await addDoc(collection(db, 'sales'), saleData);
      setPurchased(true);
    } catch (e) {
      console.error(e);
      alert("Purchase failed");
    } finally {
      setBuying(false);
    }
  };

  if (purchased) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 pt-10">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-16 h-16" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-emerald-900">Thank You!</h2>
          <p className="text-slate-500 font-bold">Your order for {item.name} has been placed.</p>
        </div>
        <Card className="text-left">
          <p className="text-xs font-bold text-slate-400 uppercase mb-2">Order Summary</p>
          <div className="flex justify-between font-black">
            <span>{item.name} ({buyQuantity} KG)</span>
            <span>₹{Number(buyQuantity) * item.price}</span>
          </div>
        </Card>
        <Button onClick={() => window.location.href = '/'}>Back to Home</Button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="relative h-64 -mx-6 -mt-6 overflow-hidden">
        <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6 text-white">
          <h1 className="text-4xl font-black">{item.name}</h1>
          <p className="flex items-center gap-2 font-bold opacity-90">
            <MapPin className="w-4 h-4" />
            {item.location}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-xs font-bold text-slate-400 uppercase">Price</p>
          <p className="text-2xl font-black text-emerald-600">₹{item.price}<span className="text-sm text-slate-400">/KG</span></p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold text-slate-400 uppercase">Available</p>
          <p className="text-2xl font-black text-blue-600">{item.quantity} KG</p>
        </Card>
      </div>

      <Card className="space-y-4">
        <div className="flex items-center gap-4 pb-4 border-b border-slate-50">
          <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white">
            <User className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Sold By</p>
            <p className="font-black text-lg">{item.farmerName}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-700">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Cultivated On</p>
            <p className="font-black text-lg">{format(new Date(item.cultivationDate), 'dd MMMM yyyy')}</p>
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <h3 className="font-black text-emerald-900">Place Your Order</h3>
        <Input label="Your Name" placeholder="Enter your name" value={customerName} onChange={e => setCustomerName(e.target.value)} />
        <Input label="Mobile Number" placeholder="Enter mobile number" type="tel" value={customerMobile} onChange={e => setCustomerMobile(e.target.value)} />
        <div className="space-y-2">
          <label className="text-sm font-bold text-emerald-800 uppercase tracking-wider ml-1">Quantity (KG)</label>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setBuyQuantity(q => Math.max(1, Number(q) - 1).toString())}
              className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700 font-black text-2xl"
            >-</button>
            <input 
              type="number" 
              className="flex-1 text-center font-black text-2xl bg-white border-2 border-emerald-100 rounded-xl py-2"
              value={buyQuantity}
              onChange={e => setBuyQuantity(e.target.value)}
            />
            <button 
              onClick={() => setBuyQuantity(q => (Number(q) + 1).toString())}
              className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700 font-black text-2xl"
            >+</button>
          </div>
        </div>
        <div className="pt-4">
          <Button onClick={handleBuy} disabled={buying}>
            {buying ? 'Processing...' : `Buy Now for ₹${Number(buyQuantity) * item.price}`}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

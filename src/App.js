import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import * as d3 from 'd3'; // Import D3.js

// Helper function to format date as DD/MM/YYYY
const formatDate = (dateString) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

// Helper function to format month as "Mês de Ano"
const formatMonthYear = (monthYearString) => {
  if (!monthYearString) return '';
  const [year, monthNum] = monthYearString.split('-');
  const date = new Date(year, monthNum - 1); // Month is 0-indexed
  const options = { month: 'long', year: 'numeric' };
  const formatted = date.toLocaleDateString('pt-BR', options);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1); // Capitalize first letter
};

// CustomDatePicker Component
function CustomDatePicker({ id, label, value, onChange, required = false }) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [displayDate, setDisplayDate] = useState(value ? new Date(value + 'T00:00:00') : new Date()); // Use 'T00:00:00' to avoid timezone issues
  const calendarRef = useRef(null);

  useEffect(() => {
    // Update displayDate when value changes from outside (e.g., editing transaction)
    if (value) {
      setDisplayDate(new Date(value + 'T00:00:00'));
    }
  }, [value]);

  // Close calendar when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [calendarRef]);

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay(); // 0 for Sunday, 1 for Monday

  const renderDays = () => {
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth(); // 0-indexed
    const numDays = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month); // Day of week for 1st day of month

    const days = [];
    // Add empty cells for days before the 1st of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2 text-center text-gray-400"></div>);
    }

    // Add actual days
    for (let day = 1; day <= numDays; day++) {
      const currentDate = new Date(year, month, day);
      const isSelected = value === currentDate.toISOString().slice(0, 10);
      const isToday = currentDate.toDateString() === new Date().toDateString();

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => {
            onChange(currentDate.toISOString().slice(0, 10));
            setShowCalendar(false);
          }}
          className={`p-2 rounded-lg text-center font-medium
            ${isSelected ? 'bg-blue-600 text-white shadow-md' : ''}
            ${isToday && !isSelected ? 'border border-blue-500 text-blue-700 bg-blue-50' : 'text-gray-800 hover:bg-gray-100'}
            transition duration-100`}
        >
          {day}
        </button>
      );
    }
    return days;
  };

  const goToPrevMonth = () => {
    setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setDisplayDate(new Date(displayDate.getFullYear() + 1, displayDate.getMonth(), 1));
  };

  const goToPrevYear = () => {
    setDisplayDate(new Date(displayDate.getFullYear() - 1, displayDate.getMonth(), 1));
  };

  const goToNextYear = () => {
    setDisplayDate(new Date(displayDate.getFullYear() + 1, displayDate.getMonth(), 1));
  };

  const goToToday = () => {
    const today = new Date();
    onChange(today.toISOString().slice(0, 10));
    setDisplayDate(today);
    setShowCalendar(false);
  };

  const clearDate = () => {
    onChange('');
    setShowCalendar(false);
  };

  const handleMonthYearChange = (e) => {
    const [year, month] = e.target.value.split('-');
    setDisplayDate(new Date(parseInt(year), parseInt(month) - 1, 1));
  };

  const currentMonthFormatted = formatMonthYear(displayDate.toISOString().slice(0, 7));


  return (
    <div className="relative" ref={calendarRef}>
      <label htmlFor={id} className="block text-gray-700 text-sm font-medium mb-2">{label}</label>
      <div className="relative">
        <input
          type="text"
          id={id}
          value={value ? formatDate(value) : ''}
          readOnly
          onClick={() => setShowCalendar(!showCalendar)}
          required={required}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200 cursor-pointer"
          placeholder="DD/MM/YYYY"
        />
        <button
          type="button"
          onClick={() => setShowCalendar(!showCalendar)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h.01M7 11h.01M11 11h.01M15 11h.01M17 11h.01M3 21h18a2 2 0 002-2V8a2 2 0 00-2-2H3a2 2 0 00-2 2v11a2 2 0 002 2z" />
          </svg>
        </button>
      </div>

      {showCalendar && (
        <div className="absolute z-10 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-72">
          {/* Calendar Header */}
          <div className="flex justify-between items-center mb-4">
            <button type="button" onClick={goToPrevMonth} className="p-2 rounded-full hover:bg-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <select
                value={displayDate.getFullYear()}
                onChange={(e) => setDisplayDate(new Date(parseInt(e.target.value), displayDate.getMonth(), 1))}
                className="p-1 border border-gray-300 rounded-md text-sm"
              >
                {Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - 10 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select
                value={displayDate.getMonth()}
                onChange={(e) => setDisplayDate(new Date(displayDate.getFullYear(), parseInt(e.target.value), 1))}
                className="p-1 border border-gray-300 rounded-md text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => i).map(monthIndex => (
                  <option key={monthIndex} value={monthIndex}>
                    {new Date(2000, monthIndex, 1).toLocaleString('pt-BR', { month: 'short' })}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" onClick={goToNextMonth} className="p-2 rounded-full hover:bg-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Days of the week */}
          <div className="grid grid-cols-7 text-center text-sm font-semibold text-gray-500 mb-2">
            <div>D</div><div>S</div><div>T</div><div>Q</div><div>Q</div><div>S</div><div>S</div>
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {renderDays()}
          </div>

          {/* Footer buttons */}
          <div className="flex justify-between mt-4 text-sm">
            <button type="button" onClick={clearDate} className="text-blue-600 hover:underline">Limpar</button>
            <button type="button" onClick={goToToday} className="text-blue-600 hover:underline">Hoje</button>
          </div>
        </div>
      )}
    </div>
  );
}


export default function App() { // Changed to direct default export
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [goals, setGoals] = useState([]); // New state for goals
  const [investments, setInvestments] = useState([]); // New state for investments
  const [emergencyReserves, setEmergencyReserves] = useState([]); // New state for emergency reserves
  // Renomeado selectedMonth para selectedDateForView e inicializado com a data de hoje
  const [selectedDateForView, setSelectedDateForView] = useState(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false); // State for side menu visibility
  const [showPdfReportModal, setShowPdfReportModal] = useState(false); // New state for PDF report modal

  // New states for transaction history filters
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDescription, setFilterDescription] = useState('');

  // Firebase Initialization and Authentication
  useEffect(() => {
    let firebaseApp;
    let firestoreDb;
    let firebaseAuth;

    try {
      let config = {};
      let initialToken = null;
      let currentAppId = 'default-app-id'; // Default for local development

      // Use Canvas global variables if they exist, otherwise use placeholders
      // The Canvas environment will inject the real values at runtime.
      if (typeof __app_id !== 'undefined') {
        currentAppId = __app_id;
      }
      if (typeof __firebase_config !== 'undefined') {
        config = JSON.parse(__firebase_config);
      } else {
        // Fallback for local development or non-Canvas environments.
        // The apiKey must be an empty string for Canvas to inject the real key.
        config = {
          apiKey: "", // IMPORTANT: Keep this empty. Canvas injects the real key at runtime.
          authDomain: "your-project-id.firebaseapp.com", // Placeholder for local dev
          projectId: "your-project-id", // Placeholder for local dev
          storageBucket: "your-project-id.appspot.com", // Placeholder for local dev
          messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // Placeholder for local dev
          appId: "YOUR_LOCAL_APP_ID" // Placeholder for local dev
        };
      }

      if (typeof __initial_auth_token !== 'undefined') {
        initialToken = __initial_auth_token;
      }

      firebaseApp = initializeApp(config);
      firestoreDb = getFirestore(firebaseApp);
      firebaseAuth = getAuth(firebaseApp);

      setDb(firestoreDb);
      setAuth(firebaseAuth);

      const unsubscribeAuth = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          setUserId(user.uid);
          setIsAuthReady(true);
        } else {
          if (initialToken) {
            try {
              await signInWithCustomToken(firebaseAuth, initialToken);
            } catch (authError) {
              console.error("Error signing in with custom token, falling back to anonymous:", authError);
              await signInAnonymously(firebaseAuth);
            }
          } else {
            await signInAnonymously(firebaseAuth);
          }
          setUserId(firebaseAuth.currentUser?.uid || crypto.randomUUID());
          setIsAuthReady(true);
        }
      });

      return () => unsubscribeAuth();
    } catch (error) {
      console.error("Error initializing Firebase:", error);
      // Potentially set an error state to display to the user
    }
  }, []); // Empty dependency array means this runs once on mount


  // Dynamically load html2canvas and jspdf libraries
  useEffect(() => {
    const loadScript = (src, id, callback) => {
      if (document.getElementById(id)) {
        if (callback) callback();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.id = id;
      script.onload = callback;
      script.onerror = () => console.error(`Failed to load script: ${src}`);
      document.head.appendChild(script);
    };

    loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'html2canvas-script', () => {
      console.log('html2canvas loaded');
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf-script', () => {
        console.log('jspdf loaded');
      });
    });
  }, []);

  // Firestore Listener for Transactions
  useEffect(() => {
    if (db && userId && isAuthReady) {
      // Determine the correct app ID for the collection path
      const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

      const transactionsCollectionPath = `artifacts/${currentAppId}/users/${userId}/transactions`;

      const transactionsCollectionRef = collection(db, transactionsCollectionPath);
      const unsubscribeTransactions = onSnapshot(transactionsCollectionRef, (snapshot) => {
        const fetchedTransactions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTransactions(fetchedTransactions);
      }, (error) => {
        console.error("Error fetching transactions: ", error);
      });

      return () => unsubscribeTransactions();
    }
  }, [db, userId, isAuthReady]);

  // Firestore Listener for Categories and initial population
  useEffect(() => {
    if (db && userId && isAuthReady) {
      // Determine the correct app ID for the collection path
      const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

      const categoriesCollectionPath = `artifacts/${currentAppId}/users/${userId}/categories`;

      const categoriesCollectionRef = collection(db, categoriesCollectionPath);
      const unsubscribeCategories = onSnapshot(categoriesCollectionRef, async (snapshot) => {
        let fetchedCategories = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Categories to be removed from display
        const categoriesToRemove = [
          'Investimento 1',
          'Investimentos 2',
          'Reserva de Emergência',
          'Reserva de Emergência da Família'
        ];

        // Filter out the unwanted categories
        fetchedCategories = fetchedCategories.filter(cat => !categoriesToRemove.includes(cat.name));


        // Sort categories: fixed categories first by their order, then non-fixed by their order
        const sortedCategories = fetchedCategories.sort((a, b) => {
          if (a.fixed && b.fixed) {
            return a.order - b.order;
          }
          if (a.fixed && !b.fixed) {
            return -1; // Fixed comes before non-fixed
          }
          if (!a.fixed && b.fixed) {
            return 1; // Non-fixed comes after fixed
          }
          // For non-fixed categories, sort by their order
          return a.order - b.order;
        });
        setCategories(sortedCategories);

        // If fixed categories are not present, pre-populate them
        const predefinedCategories = [
            { name: 'Gastos mensais', symbol: '🏠', fixed: true, order: 0 },
            { name: 'Pagamento de despesas', symbol: '🧾', fixed: true, order: 1 },
            { name: 'Imprevistos', symbol: '🚨', fixed: true, order: 2 },
          ];

          for (const cat of predefinedCategories) {
            // Check if category already exists to prevent duplicates on re-render
            const q = query(categoriesCollectionRef, where("name", "==", cat.name));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
              await addDoc(categoriesCollectionRef, { ...cat, userId });
            }
          }
      }, (error) => {
        console.error("Error fetching categories:", error);
      });

      return () => unsubscribeCategories();
    }
  }, [db, userId, isAuthReady]);

  // Firestore Listener for Goals
  useEffect(() => {
    if (db && userId && isAuthReady) {
      // Determine the correct app ID for the collection path
      const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

      const goalsCollectionPath = `artifacts/${currentAppId}/users/${userId}/goals`;
      const goalsCollectionRef = collection(db, goalsCollectionPath);
      const unsubscribeGoals = onSnapshot(goalsCollectionRef, (snapshot) => {
        const fetchedGoals = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setGoals(fetchedGoals);
      }, (error) => {
        console.error("Error fetching goals:", error);
      });

      return () => unsubscribeGoals();
    }
  }, [db, userId, isAuthReady]);

  // Firestore Listener for Investments
  useEffect(() => {
    if (db && userId && isAuthReady) {
      // Determine the correct app ID for the collection path
      const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

      const investmentsCollectionPath = `artifacts/${currentAppId}/users/${userId}/investments`;
      const investmentsCollectionRef = collection(db, investmentsCollectionPath);
      const unsubscribeInvestments = onSnapshot(investmentsCollectionRef, (snapshot) => {
        const fetchedInvestments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setInvestments(fetchedInvestments);
      }, (error) => {
        console.error("Error fetching investments:", error);
      });

      return () => unsubscribeInvestments();
    }
  }, [db, userId, isAuthReady]);

  // Firestore Listener for Emergency Reserves
  useEffect(() => {
    if (db && userId && isAuthReady) {
      // Determine the correct app ID for the collection path
      const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

      const emergencyReservesCollectionPath = `artifacts/${currentAppId}/users/${userId}/emergencyReserves`;
      const emergencyReservesCollectionRef = collection(db, emergencyReservesCollectionPath);
      const unsubscribeEmergencyReserves = onSnapshot(emergencyReservesCollectionRef, (snapshot) => {
        const fetchedReserves = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setEmergencyReserves(fetchedReserves);
      }, (error) => {
        console.error("Error fetching emergency reserves:", error);
      });

      return () => unsubscribeEmergencyReserves();
    }
  }, [db, userId, isAuthReady]);


  const addTransaction = async (transaction) => {
    if (!db || !userId) return;
    try {
      const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const transactionsCollectionPath = `artifacts/${currentAppId}/users/${userId}/transactions`;
      const transactionsCollectionRef = collection(db, transactionsCollectionPath);
      await addDoc(transactionsCollectionRef, { ...transaction, userId });
    } catch (e) {
      console.error("Erro ao adicionar transação: ", e);
    }
  };

  const updateTransaction = async (id, updatedTransaction) => {
    if (!db || !userId) return;
    try {
      const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const transactionsCollectionPath = `artifacts/${currentAppId}/users/${userId}/transactions`;
      const transactionDocRef = doc(db, transactionsCollectionPath, id);
      await updateDoc(transactionDocRef, updatedTransaction);
    } catch (e) {
      console.error("Erro ao atualizar transação: ", e);
    }
  };

  const deleteTransaction = async (id) => {
    if (!db || !userId) return;
    try {
      const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const transactionsCollectionPath = `artifacts/${currentAppId}/users/${userId}/transactions`;
      const transactionDocRef = doc(db, transactionsCollectionPath, id);
      await deleteDoc(transactionDocRef);
    } catch (e) {
      console.error("Erro ao excluir transação: ", e);
    }
  };

  const addCategory = async (category) => {
    if (!db || !userId) return;
    try {
      const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const categoriesCollectionPath = `artifacts/${currentAppId}/users/${userId}/categories`;
      const categoriesCollectionRef = collection(db, categoriesCollectionPath);
      // Determine the next order for non-fixed categories
      const nonFixedCategories = categories.filter(cat => !cat.fixed);
      const maxOrder = nonFixedCategories.length > 0
        ? Math.max(...nonFixedCategories.map(cat => cat.order))
        : -1; 
      
      await addDoc(categoriesCollectionRef, { ...category, userId, fixed: false, order: maxOrder + 1 });
    } catch (e) {
      console.error("Erro ao adicionar categoria: ", e);
    }
  };

  const deleteCategory = async (id) => {
    if (!db || !userId) return;
    try {
      const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const categoriesCollectionPath = `artifacts/${currentAppId}/users/${userId}/categories`;
      const categoryDocRef = doc(db, categoriesCollectionPath, id);
      await deleteDoc(categoryDocRef);
    } catch (e) {
      console.error("Erro ao excluir categoria: ", e);
    }
  };

  const reorderCategories = async (draggedId, targetId, isFixedGroup) => {
    if (!db || !userId) return;

    const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    let groupToReorder = [];
    if (isFixedGroup) {
      groupToReorder = categories.filter(cat => cat.fixed).sort((a, b) => a.order - b.order);
    } else {
      groupToReorder = categories.filter(cat => !cat.fixed).sort((a, b) => a.order - b.order);
    }

    const draggedIndex = groupToReorder.findIndex(cat => cat.id === draggedId);
    const targetIndex = groupToReorder.findIndex(cat => cat.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const [removed] = groupToReorder.splice(draggedIndex, 1);
    groupToReorder.splice(targetIndex, 0, removed);

    // Update the order for the reordered group in Firestore
    for (let i = 0; i < groupToReorder.length; i++) {
      const cat = groupToReorder[i];
      // Only update if order changed to avoid unnecessary writes
      if (cat.order !== i) {
        const categoryDocRef = doc(db, `artifacts/${currentAppId}/users/${userId}/categories`, cat.id);
        await updateDoc(categoryDocRef, { order: i });
      }
    }
  };

  // Goal Management Functions
  const addGoal = async (goal) => {
    if (!db || !userId) return;
    try {
      const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const goalsCollectionPath = `artifacts/${currentAppId}/users/${userId}/goals`;
      const goalsCollectionRef = collection(db, goalsCollectionPath);
      await addDoc(goalsCollectionRef, { ...goal, userId });
    } catch (e) {
      console.error("Erro ao adicionar meta: ", e);
    }
  };

  const updateGoal = async (id, updatedGoal) => {
    if (!db || !userId) return;
    try {
      const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const goalsCollectionPath = `artifacts/${currentAppId}/users/${userId}/goals`;
      const goalDocRef = doc(db, goalsCollectionPath, id);
      await updateDoc(goalDocRef, updatedGoal);
    } catch (e) {
      console.error("Erro ao atualizar meta: ", e);
    }
  };

  const deleteGoal = async (id) => {
    if (!db || !userId) return;
    try {
      const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const goalsCollectionPath = `artifacts/${currentAppId}/users/${userId}/goals`;
      const goalDocRef = doc(db, goalsCollectionPath, id);
      await deleteDoc(goalDocRef);
    } catch (e) {
      console.error("Erro ao excluir meta: ", e);
    }
  };

  // Investment Management Functions
  const addInvestment = async (investment) => {
    if (!db || !userId) return;
    try {
      const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const investmentsCollectionPath = `artifacts/${currentAppId}/users/${userId}/investments`;
      const investmentsCollectionRef = collection(db, investmentsCollectionPath);
      await addDoc(investmentsCollectionRef, { ...investment, userId });
    } catch (e) {
      console.error("Erro ao adicionar investimento: ", e);
    }
  };

  const updateInvestment = async (id, updatedInvestment) => {
    if (!db || !userId) return;
    try {
      const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const investmentsCollectionPath = `artifacts/${currentAppId}/users/${userId}/investments`;
      const investmentDocRef = doc(db, investmentsCollectionPath, id);
      await updateDoc(investmentDocRef, updatedInvestment);
    } catch (e) {
      console.error("Erro ao atualizar investimento: ", e);
    }
  };

  const deleteInvestment = async (id) => {
    if (!db || !userId) return;
    try {
      const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const investmentsCollectionPath = `artifacts/${currentAppId}/users/${userId}/investments`;
      const investmentDocRef = doc(db, investmentsCollectionPath, id);
      await deleteDoc(investmentDocRef);
    } catch (e) {
      console.error("Erro ao excluir investimento: ", e);
    }
  };

  // Emergency Reserve Management Functions
  const addEmergencyReserve = async (reserve) => {
    if (!db || !userId) return;
    try {
      const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const emergencyReservesCollectionPath = `artifacts/${currentAppId}/users/${userId}/emergencyReserves`;
      const emergencyReservesCollectionRef = collection(db, emergencyReservesCollectionPath);
      await addDoc(emergencyReservesCollectionRef, { ...reserve, userId });
    } catch (e) {
      console.error("Erro ao adicionar reserva de emergência: ", e);
    }
  };

  const updateEmergencyReserve = async (id, updatedReserve) => {
    if (!db || !userId) return;
    try {
      const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const emergencyReservesCollectionPath = `artifacts/${currentAppId}/users/${userId}/emergencyReserves`;
      const emergencyReserveDocRef = doc(db, emergencyReservesCollectionPath, id);
      await updateDoc(emergencyReserveDocRef, updatedReserve);
    } catch (e) {
      console.error("Erro ao atualizar reserva de emergência: ", e);
    }
  };

  const deleteEmergencyReserve = async (id) => {
    if (!db || !userId) return;
    try {
      const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const emergencyReservesCollectionPath = `artifacts/${currentAppId}/users/${userId}/emergencyReserves`;
      const emergencyReserveDocRef = doc(db, emergencyReservesCollectionPath, id);
      await deleteDoc(emergencyReserveDocRef);
    } catch (e) {
      console.error("Erro ao excluir reserva de emergência: ", e);
    }
  };


  const calculateTotals = useCallback(() => {
    // Extrai o ano e mês da data selecionada para visualização
    const monthYearString = selectedDateForView ? selectedDateForView.slice(0, 7) : '';
    const monthlyTransactions = transactions.filter(t => t.date.startsWith(monthYearString) && t.date <= selectedDateForView);
    const totalIncome = monthlyTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.value), 0);
    const totalExpense = monthlyTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.value), 0);
    const balance = totalIncome - totalExpense;
    return { totalIncome, totalExpense, balance };
  }, [transactions, selectedDateForView]);

  const { totalIncome, totalExpense, balance } = calculateTotals();

  // Filter transactions based on selected month, category, and description
  const filteredTransactions = transactions.filter(t => {
    // Extrai o ano e mês da data selecionada para visualização
    const monthYearString = selectedDateForView ? selectedDateForView.slice(0, 7) : '';
    const matchesMonthAndDay = t.date.startsWith(monthYearString) && t.date <= selectedDateForView;
    const matchesCategory = filterCategory ? t.category.toLowerCase().includes(filterCategory.toLowerCase()) : true;
    const matchesDescription = filterDescription ? t.description.toLowerCase().includes(filterDescription.toLowerCase()) : true;
    return matchesMonthAndDay && matchesCategory && matchesDescription;
  });

  // Debugging logs
  console.log('App: selectedDateForView:', selectedDateForView);
  const currentMonthYearFilter = selectedDateForView ? selectedDateForView.slice(0, 7) : '';
  console.log('App: Current Month-Year Filter:', currentMonthYearFilter);
  console.log('App: Total transactions:', transactions.length);
  console.log('App: Filtered transactions count:', filteredTransactions.length);


  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showConfirmCategoryModal, setShowConfirmCategoryModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  // const [showCategoryDetailModal, setShowCategoryDetailModal] = useState(false); // Removed unused state

  const handleEditClick = (transaction) => {
    setEditingTransaction(transaction);
    setShowSideMenu(true); // Open side menu when editing a transaction
  };

  const handleDeleteClick = (transactionId) => {
    setTransactionToDelete(transactionId);
    setShowConfirmModal(true);
  };

  const confirmDelete = () => {
    if (transactionToDelete) {
      deleteTransaction(transactionToDelete);
      setTransactionToDelete(null);
      setShowConfirmModal(false);
    }
  };

  const cancelDelete = () => {
    setTransactionToDelete(null);
    setShowConfirmModal(false);
  };

  const handleCategoryDeleteClick = (categoryId) => {
    setCategoryToDelete(categoryId);
    setShowConfirmCategoryModal(true);
  };

  const confirmCategoryDelete = () => {
    if (categoryToDelete) {
      deleteCategory(categoryToDelete);
      setCategoryToDelete(null);
      setShowConfirmCategoryModal(false);
    }
  };

  const cancelCategoryDelete = () => {
    setCategoryToDelete(null);
    setShowConfirmCategoryModal(false);
  };

  // If not authenticated or auth is not ready, show AuthScreen
  if (!isAuthReady || !userId) {
    return <AuthScreen auth={auth} db={db} />;
  }

  return (
    <div className="min-h-screen bg-cover bg-center bg-fixed font-inter" style={{ backgroundImage: `url('http://googleusercontent.com/file_content/41')` }}>
      {/* Menu Button - Always visible */}
      <button
        onClick={() => setShowSideMenu(true)}
        className="absolute top-4 left-4 p-3 bg-blue-600 text-white rounded-full shadow-md hover:bg-blue-700 transition duration-200 z-20" // Increased z-index
        title="Mais opções"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Main content - conditionally rendered */}
      {!showSideMenu && (
        <div className="max-w-4xl mx-auto bg-green-50 rounded-2xl shadow-xl p-6 md:p-8 relative">
          <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-8 tracking-tight"
              style={{ fontFamily: 'Times New Roman, serif', fontSize: '3.5rem', fontWeight: 'bold' }}>
            Meu Controle Financeiro
          </h1>

          {userId && (
            <div className="text-center text-sm text-gray-600 mb-4">
              ID do Usuário: <span className="font-mono bg-gray-100 px-2 py-1 rounded-md">{userId}</span>
            </div>
          )}

          {/* Totals Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-5 rounded-xl shadow-lg flex flex-col items-center justify-center">
              <span className="text-sm font-medium opacity-90">Saldo Total</span>
              <span className="text-3xl font-bold mt-1">R$ {balance.toFixed(2)}</span>
            </div>
            {/* Saídas (Expenses) */}
            <div className="bg-gradient-to-r from-red-500 to-orange-600 text-white p-5 rounded-xl shadow-lg flex flex-col items-center justify-center">
              <span className="text-sm font-medium opacity-90">Saídas</span>
              <span className="text-3xl font-bold mt-1">R$ {totalExpense.toFixed(2)}</span>
            </div>
            {/* Entradas (Income) */}
            <div className="bg-gradient-to-r from-green-500 to-teal-600 text-white p-5 rounded-xl shadow-lg flex flex-col items-center justify-center">
              <span className="text-sm font-medium opacity-90">Entradas</span>
              <span className="text-3xl font-bold mt-1">R$ {totalIncome.toFixed(2)}</span>
            </div>
          </div>

          {/* Monthly View Selector - Agora usando CustomDatePicker */}
          <div className="flex justify-center items-center gap-4 my-8 p-4 bg-gray-50 rounded-xl shadow-inner">
            <CustomDatePicker
              id="month-select"
              label="Visualizar por Mês:"
              value={selectedDateForView}
              onChange={setSelectedDateForView}
              required={true}
            />
          </div>

          {/* Transaction History Header with new button */}
          <div className="flex items-center justify-between mb-6 mt-8">
            <h2 className="text-3xl font-bold text-gray-800 text-center flex-grow">Histórico de Transações</h2>
            <button
              onClick={() => setShowPdfReportModal(true)} // Open PDF report modal
              className="p-3 bg-blue-600 text-white rounded-full shadow-md hover:bg-blue-700 transition duration-200 flex items-center justify-center text-2xl font-bold"
              title="Baixar Relatório PDF"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Transaction Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label htmlFor="filter-category" className="block text-gray-700 text-sm font-medium mb-2">Filtrar por Categoria:</label>
              <select
                id="filter-category"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
              >
                <option value="">Todas as Categorias</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.symbol} {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-description" className="block text-gray-700 text-sm font-medium mb-2">Filtrar por Descrição:</label>
              <input
                type="text"
                id="filter-description"
                value={filterDescription}
                onChange={(e) => setFilterDescription(e.target.value)}
                placeholder="Descrição da Transação"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
              />
            </div>
          </div>

          {/* Transaction History */}
          {filteredTransactions.length === 0 ? (
            <p className="text-center text-gray-500 text-lg">Nenhuma transação para este mês com os filtros aplicados.</p>
          ) : (
            <div className="space-y-4">
              {filteredTransactions
                .sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort by date, newest first
                .map((transaction) => (
                  <TransactionItem
                    key={transaction.id}
                    transaction={transaction}
                    categories={categories}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                  />
                ))}
            </div>
          )}
        </div>
      )}

      {/* Side Menu */}
      <SideMenu
        isOpen={showSideMenu}
        onClose={() => setShowSideMenu(false)}
        addTransaction={addTransaction}
        updateTransaction={updateTransaction}
        categories={categories}
        setShowAddCategoryModal={setShowAddCategoryModal}
        editingTransaction={editingTransaction}
        setEditingTransaction={setEditingTransaction}
        goals={goals} // Pass goals to SideMenu
        addGoal={addGoal} // Pass goal functions to SideMenu
        updateGoal={updateGoal}
        deleteGoal={deleteGoal}
        investments={investments} // Pass investments to SideMenu
        addInvestment={addInvestment} // Pass investment functions to SideMenu
        updateInvestment={updateInvestment}
        deleteInvestment={deleteInvestment}
        emergencyReserves={emergencyReserves} // Pass emergency reserves to SideMenu
        addEmergencyReserve={addEmergencyReserve} // Pass emergency reserve functions to SideMenu
        updateEmergencyReserve={updateEmergencyReserve}
        deleteEmergencyReserve={deleteEmergencyReserve}
      />

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <AddCategoryModal
          addCategory={addCategory}
          onClose={() => setShowAddCategoryModal(false)}
          categories={categories} // Pass categories to the modal to display existing ones
          onDeleteCategory={handleCategoryDeleteClick} // Pass delete handler
          reorderCategories={reorderCategories} // Pass reorder handler
        />
      )}

      {/* PDF Report Modal */}
      {showPdfReportModal && (
        <PdfReportModal
          transactions={transactions}
          categories={categories}
          onClose={() => setShowPdfReportModal(false)}
        />
      )}

      {/* Confirmation Modal for Deletion */}
      {showConfirmModal && (
        <ConfirmationModal
          message="Tem certeza que deseja excluir esta transação?"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}

      {/* Confirmation Modal for Category Deletion */}
      {showConfirmCategoryModal && (
        <ConfirmationModal
          message="Tem certeza que deseja excluir esta categoria? Isso não excluirá as transações existentes com esta categoria."
          onConfirm={confirmCategoryDelete}
          onCancel={cancelCategoryDelete}
        />
      )}
    </div>
  );
}

// AuthScreen Component
function AuthScreen({ auth, db }) {
  const [isRegistering, setIsRegistering] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleAuthAction = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      if (isRegistering) {
        // Register with email and password only
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Optionally, save a basic profile with just email
        const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const userDocRef = doc(db, `artifacts/${currentAppId}/users/${user.uid}/profile`, user.uid);
        await setDoc(userDocRef, {
          email: user.email,
          createdAt: new Date().toISOString(),
        });
        setMessage('Registro bem-sucedido! Você está logado.');
      } else {
        // Login
        await signInWithEmailAndPassword(auth, email, password);
        setMessage('Login bem-sucedido!');
      }
    } catch (err) {
      console.error("Erro de autenticação:", err);
      let errorMessage = "Ocorreu um erro. Tente novamente.";
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'Este e-mail já está em uso.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Endereço de e-mail inválido.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'A senha deve ter pelo menos 6 caracteres.';
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        errorMessage = 'E-mail ou senha inválidos.';
      }
      setError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
          {isRegistering ? 'Criar Conta' : 'Fazer Login'}
        </h2>

        <form onSubmit={handleAuthAction} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-gray-700 text-sm font-medium mb-2">E-mail</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-gray-700 text-sm font-medium mb-2">Senha</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
            />
          </div>

          {error && <p className="text-red-600 text-center">{error}</p>}
          {message && <p className="text-green-600 text-center">{message}</p>}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-lg shadow-md hover:bg-blue-700 transition duration-200 transform hover:scale-105"
          >
            {isRegistering ? 'Registrar' : 'Entrar'}
          </button>
        </form>

        <button
          onClick={() => setIsRegistering(!isRegistering)}
          className="w-full mt-4 text-blue-600 hover:underline transition duration-200"
        >
          {isRegistering ? 'Já tem uma conta? Faça login' : 'Não tem uma conta? Registre-se'}
        </button>
      </div>
    </div>
  );
}

// Side Menu Component
function SideMenu({ isOpen, onClose, addTransaction, updateTransaction, categories, setShowAddCategoryModal, editingTransaction, setEditingTransaction, goals, addGoal, updateGoal, deleteGoal, investments, addInvestment, updateInvestment, deleteInvestment, emergencyReserves, addEmergencyReserve, updateEmergencyReserve, deleteEmergencyReserve }) {
  const [selectedMenuItem, setSelectedMenuItem] = useState('addTransaction'); // 'addTransaction', 'myGoals', 'myInvestments', or 'emergencyReserves'

  const handleMenuItemClick = (menuItem) => {
    setSelectedMenuItem(menuItem);
    // Optionally, you can close the menu after a selection if you want it to behave like a modal
    // onClose();
  };

  return (
    <div
      className={`fixed inset-0 bg-gray-600 bg-opacity-75 flex items-start justify-start transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out z-50`}
      onClick={onClose} // Close menu when clicking on the overlay
    >
      <div
        className="w-full h-full bg-white shadow-lg p-4 overflow-y-auto" // Occupy full screen
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside menu from closing it
      >
        <div className="flex justify-end mb-4">
          <button
            onClick={onClose}
            className="p-2 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition duration-200"
            title="Fechar Menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Mais opções</h3>
        <nav className="space-y-4 mb-8">
          <button
            onClick={() => handleMenuItemClick('addTransaction')}
            className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition duration-200 ${selectedMenuItem === 'addTransaction' ? 'bg-blue-600 text-white shadow-md' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}
          >
            Adicionar Nova Transação
          </button>
          <button
            onClick={() => handleMenuItemClick('myGoals')}
            className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition duration-200 ${selectedMenuItem === 'myGoals' ? 'bg-blue-600 text-white shadow-md' : 'bg-purple-100 text-purple-800 hover:bg-purple-200'}`}
          >
            Minhas Metas
          </button>
          <button
            onClick={() => handleMenuItemClick('myInvestments')}
            className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition duration-200 ${selectedMenuItem === 'myInvestments' ? 'bg-blue-600 text-white shadow-md' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'}`}
          >
            Meus Investimentos
          </button>
          <button
            onClick={() => handleMenuItemClick('emergencyReserves')}
            className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition duration-200 ${selectedMenuItem === 'emergencyReserves' ? 'bg-blue-600 text-white shadow-md' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
          >
            Reservas de Emergência
          </button>
        </nav>

        {selectedMenuItem === 'addTransaction' && (
          <TransactionForm
            addTransaction={addTransaction}
            updateTransaction={updateTransaction}
            categories={categories}
            setShowAddCategoryModal={setShowAddCategoryModal}
            editingTransaction={editingTransaction}
            setEditingTransaction={setEditingTransaction}
            onCloseForm={onClose} // Pass onClose to the form to close the menu
          />
        )}

        {selectedMenuItem === 'myGoals' && (
          <MyGoals
            goals={goals}
            addGoal={addGoal}
            updateGoal={updateGoal}
            deleteGoal={deleteGoal}
          />
        )}

        {selectedMenuItem === 'myInvestments' && (
          <MyInvestments
            investments={investments}
            addInvestment={addInvestment}
            updateInvestment={updateInvestment}
            deleteInvestment={deleteInvestment}
          />
        )}

        {selectedMenuItem === 'emergencyReserves' && (
          <MyEmergencyReserves
            emergencyReserves={emergencyReserves}
            addEmergencyReserve={addEmergencyReserve}
            updateEmergencyReserve={updateEmergencyReserve}
            deleteEmergencyReserve={deleteEmergencyReserve}
          />
        )}
      </div>
    </div>
  );
}


// Transaction Form Component
function TransactionForm({ addTransaction, updateTransaction, categories, setShowAddCategoryModal, editingTransaction, setEditingTransaction, onCloseForm }) {
  const [value, setValue] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  const [description, setDescription] = useState('');
  const [type, setType] = useState('expense'); // 'income' or 'expense'

  useEffect(() => {
    if (editingTransaction) {
      setValue(editingTransaction.value);
      setCategory(editingTransaction.category);
      setDate(editingTransaction.date);
      setDescription(editingTransaction.description);
      setType(editingTransaction.type);
    } else {
      // Reset form when not editing
      setValue('');
      setCategory('');
      setDate(new Date().toISOString().slice(0, 10));
      setDescription('');
      setType('expense');
    }
  }, [editingTransaction]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!value || !category || !date || !description) {
      alert("Por favor, preencha todos os campos."); // Using alert for simplicity, but a custom modal is preferred.
      return;
    }

    const transactionData = {
      value: parseFloat(value),
      category,
      date,
      description,
      type,
    };

    if (editingTransaction) {
      await updateTransaction(editingTransaction.id, transactionData);
    } else {
      await addTransaction(transactionData);
    }

    // Reset form
    setValue('');
    setCategory('');
    setDate(new Date().toISOString().slice(0, 10));
    setDescription('');
    setType('expense');
    setEditingTransaction(null); // Clear editing state
    onCloseForm(); // Close the side menu after submission
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 p-6 rounded-2xl shadow-inner mb-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        {editingTransaction ? 'Editar Transação' : 'Adicionar Nova Transação'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label htmlFor="value" className="block text-gray-700 text-sm font-medium mb-2">Valor (R$)</label>
          <input
            type="number"
            id="value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            step="0.01"
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
          />
        </div>
        <div>
          <label htmlFor="category" className="block text-gray-700 text-sm font-medium mb-2">Categoria</label>
          <div className="flex items-center gap-2">
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
            >
              <option value="">Selecione uma categoria</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.symbol} {cat.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowAddCategoryModal(true)}
              className="p-3 bg-indigo-500 text-white rounded-lg shadow-md hover:bg-indigo-600 transition duration-200 flex items-center justify-center"
              title="Adicionar Nova Categoria"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        {/* Reverted to standard input type="date" */}
        <div>
          <label htmlFor="date" className="block text-gray-700 text-sm font-medium mb-2">Data</label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-gray-700 text-sm font-medium mb-2">Descrição</label>
          <input
            type="text"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
          />
        </div>
      </div>
      <div className="mb-6">
        <span className="block text-gray-700 text-sm font-medium mb-2">Tipo</span>
        <div className="flex gap-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="type"
              value="income"
              checked={type === 'income'}
              onChange={(e) => setType(e.target.value)}
              className="form-radio h-5 w-5 text-green-600"
            />
            <span className="ml-2 text-gray-700">Entrada</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="type"
              value="expense"
              checked={type === 'expense'}
              onChange={(e) => setType(e.target.value)}
              className="form-radio h-5 w-5 text-red-600"
            />
            <span className="ml-2 text-gray-700">Saída</span>
          </label>
        </div>
      </div>
      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-lg shadow-md hover:bg-blue-700 transition duration-200 transform hover:scale-105"
      >
        {editingTransaction ? 'Atualizar Transação' : 'Adicionar Transação'}
      </button>
      {editingTransaction && (
        <button
          type="button"
          onClick={() => { setEditingTransaction(null); onCloseForm(); }}
          className="w-full mt-4 bg-gray-400 text-white py-3 rounded-xl font-semibold text-lg shadow-md hover:bg-gray-500 transition duration-200 transform hover:scale-105"
        >
          Cancelar Edição
        </button>
      )}
    </form>
  );
}

// Transaction Item Component
function TransactionItem({ transaction, categories, onEdit, onDelete }) {
  const categorySymbol = categories.find(cat => cat.name === transaction.category)?.symbol || '❓';
  const isIncome = transaction.type === 'income';

  return (
    <div className={`flex items-center justify-between p-4 rounded-xl shadow-md transition duration-200 ease-in-out transform hover:-translate-y-1 ${isIncome ? 'bg-green-50' : 'bg-red-50'}`}>
      <div className="flex items-center gap-4">
        <span className="text-3xl">{categorySymbol}</span>
        <div>
          <p className="text-lg font-semibold text-gray-800">{transaction.description}</p>
          <p className="text-sm text-gray-600">{formatDate(transaction.date)}</p> {/* Formatted date */}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className={`text-xl font-bold ${isIncome ? 'text-green-700' : 'text-red-700'}`}>
          {isIncome ? '+' : '-'} R$ {parseFloat(transaction.value).toFixed(2)}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(transaction)}
            className="p-2 bg-yellow-500 text-white rounded-full shadow-md hover:bg-yellow-600 transition duration-200"
            title="Editar Transação"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.38-2.828-2.828z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(transaction.id)}
            className="p-2 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700 transition duration-200"
            title="Excluir Transação"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Add Category Modal Component
function AddCategoryModal({ addCategory, onClose, categories, onDeleteCategory, reorderCategories }) {
  const [categoryName, setCategoryName] = useState('');
  const [categorySymbol, setCategorySymbol] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);

  // Predefined list of money/finance related emojis
  const moneySymbols = [
    '💰', '💸', '💳', '🏦', '💵', '💶', '💷', '💴', '🪙', '📈', '📉', '🧾', '📊', '💼', '🏡', '🚗', '🛒', '🍔', '✈️', '🎁', '💡', '🩺', '📚', '🎉', '💧', '🏠', '👨‍👩‍👧‍👦', '🚨', '📌' // Added pin for fixed
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!categoryName || !categorySymbol) {
      alert("Por favor, preencha o nome e selecione um símbolo para a categoria.");
      return;
    }
    addCategory({ name: categoryName, symbol: categorySymbol });
    setCategoryName('');
    setCategorySymbol('');
  };

  const handleDragStart = (e, id, isFixed) => {
    setDraggedItem({ id, isFixed });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify({ id, isFixed }));
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Allow dropping
  };

  const handleDrop = (e, targetId, targetIsFixed) => {
    e.preventDefault();
    if (!draggedItem) return;

    const { id: draggedId, isFixed: draggedIsFixed } = draggedItem;

    // Prevent reordering between fixed and non-fixed groups
    if (draggedIsFixed !== targetIsFixed) {
      return;
    }

    reorderCategories(draggedId, targetId, draggedIsFixed);
    setDraggedItem(null);
  };

  // Separate fixed and non-fixed categories for display
  const fixedCategories = categories.filter(cat => cat.fixed).sort((a, b) => a.order - b.order);
  const userCategories = categories.filter(cat => !cat.fixed).sort((a, b) => a.order - b.order); // Sort by order for user categories

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Gerenciar Categorias</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="category-name" className="block text-gray-700 text-sm font-medium mb-2">Nome da Categoria</label>
            <input
              type="text"
              id="category-name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-medium mb-2">Selecione um Símbolo</label>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-300 rounded-lg">
              {moneySymbols.map((symbol, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setCategorySymbol(symbol)}
                  className={`p-2 rounded-lg text-2xl hover:bg-blue-100 transition duration-200
                    ${categorySymbol === symbol ? 'bg-blue-200 ring-2 ring-blue-500' : 'bg-gray-100'}`}
                  title={symbol}
                >
                  {symbol}
                </button>
              ))}
            </div>
            {categorySymbol && (
              <p className="mt-2 text-center text-gray-600">Símbolo Selecionado: <span className="text-3xl">{categorySymbol}</span></p>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-300 text-gray-800 rounded-xl font-semibold shadow-md hover:bg-gray-400 transition duration-200"
            >
              Fechar
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold shadow-md hover:bg-indigo-700 transition duration-200"
            >
              Adicionar Categoria
            </button>
          </div>
        </form>

        {/* Combined Categories List */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h4 className="text-xl font-bold text-gray-800 mb-4 text-center">Categorias Existentes</h4>
          {categories.length === 0 ? (
            <p className="text-center text-gray-500">Nenhuma categoria adicionada ainda.</p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto p-2 border border-gray-300 rounded-lg"> {/* Combined scrollable list */}
              {fixedCategories.map((cat, index) => (
                <li
                  key={cat.id}
                  draggable="true"
                  onDragStart={(e) => handleDragStart(e, cat.id, true)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, cat.id, true)}
                  className="flex items-center justify-between bg-blue-50 p-3 rounded-lg shadow-sm cursor-grab"
                >
                  <span className="text-lg text-gray-700">
                    {index + 1}. <span className="text-xl">📌</span> {cat.symbol} {cat.name}
                  </span>
                  {/* No delete button for fixed categories */}
                </li>
              ))}
              {userCategories.map((cat) => (
                <li
                  key={cat.id}
                  draggable="true"
                  onDragStart={(e) => handleDragStart(e, cat.id, false)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, cat.id, false)}
                  className="flex items-center justify-between bg-gray-50 p-3 rounded-lg shadow-sm cursor-grab"
                >
                  <span className="text-lg text-gray-700">{cat.symbol} {cat.name}</span>
                  <button
                    onClick={() => onDeleteCategory(cat.id)}
                    className="p-2 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition duration-200"
                    title="Excluir Categoria"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// PDF Report Modal Component (New)
function PdfReportModal({ transactions, categories, onClose }) {
  const reportRef = useRef();
  // Alterado para usar CustomDatePicker para seleção de mês no relatório
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD

  // Filter transactions for the selected month (extraindo YYYY-MM da data completa)
  const reportMonth = reportDate ? reportDate.slice(0, 7) : '';
  const monthlyTransactions = transactions.filter(t => t.date.startsWith(reportMonth) && t.date <= reportDate);

  // Calculate totals for the selected month
  const totalIncome = monthlyTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.value), 0);
  const totalExpense = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.value), 0);

  // Get previous month's spending for comparison
  const getMonthSpending = (month) => {
    return transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(month))
      .reduce((sum, t) => sum + parseFloat(t.value), 0);
  };

  const [year, month] = reportMonth.split('-').map(Number);
  let prevMonthYear = year;
  let prevMonthMonth = month - 1;
  if (prevMonthMonth === 0) {
    prevMonthMonth = 12;
    prevMonthYear -= 1;
  }
  const prevMonth = `${prevMonthYear}-${String(prevMonthMonth).padStart(2, '0')}`;
  const previousMonthSpending = getMonthSpending(prevMonth);

  let spendingReportMessage = '';
  if (previousMonthSpending === 0 && totalExpense > 0) {
    spendingReportMessage = `Você começou a ter gastos neste mês. Total: R$ ${totalExpense.toFixed(2)}.`;
  } else if (totalExpense > previousMonthSpending) {
    const increase = totalExpense - previousMonthSpending;
    const percentage = (increase / previousMonthSpending) * 100;
    spendingReportMessage = `Aumento de gastos em R$ ${increase.toFixed(2)} (${percentage.toFixed(2)}%) em relação ao mês anterior. Total: R$ ${totalExpense.toFixed(2)}.`;
  } else if (totalExpense < previousMonthSpending) {
    const decrease = previousMonthSpending - totalExpense;
    const percentage = (decrease / previousMonthSpending) * 100;
    spendingReportMessage = `Diminuição de gastos em R$ ${decrease.toFixed(2)} (${percentage.toFixed(2)}%) em relação ao mês anterior. Total: R$ ${totalExpense.toFixed(2)}.`;
  } else {
    spendingReportMessage = `Seus gastos estão na média em relação ao mês anterior. Total: R$ ${totalExpense.toFixed(2)}.`;
  }

  // Group transactions by category for detailed view
  const groupedTransactions = monthlyTransactions.reduce((acc, transaction) => {
    if (!acc[transaction.category]) {
      acc[transaction.category] = [];
    }
    acc[transaction.category].push(transaction);
    return acc;
  }, {});

  const downloadPdf = async () => {
    if (monthlyTransactions.length === 0) {
      alert("Não há transações para gerar o relatório neste mês.");
      return;
    }

    if (!window.html2canvas || !window.jspdf) {
      alert("As bibliotecas de PDF não foram carregadas. Por favor, tente novamente.");
      return;
    }

    const input = reportRef.current;
    const canvas = await window.html2canvas(input, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    let imgHeight = canvas.height * imgWidth / canvas.width;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    let heightLeft = imgHeight; // Initialize heightLeft after first addImage call
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`Relatorio_Financeiro_${reportMonth}.pdf`);
  };


  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-800">Gerar Relatório Financeiro Mensal</h3>
          <button
            onClick={onClose}
            className="p-2 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition duration-200"
            title="Fechar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Month Selector for Report - Agora usando CustomDatePicker */}
        <div className="flex justify-center items-center gap-4 my-4 p-4 bg-gray-50 rounded-xl shadow-inner">
          <CustomDatePicker
            id="report-month-select"
            label="Mês do Relatório:"
            value={reportDate}
            onChange={setReportDate}
            required={true}
          />
        </div>

        <div ref={reportRef} className="p-4 bg-white rounded-lg overflow-x-auto"> {/* Added overflow-x-auto here */}
          <h4 className="text-xl font-bold text-gray-800 mb-4 text-center">Relatório de {formatMonthYear(reportMonth)}</h4>

          {/* Totals Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6 text-center">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Renda Total</p>
              <p className="font-bold text-blue-700">R$ {totalIncome.toFixed(2)}</p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Despesa Total</p>
              <p className="font-bold text-red-700">R$ {totalExpense.toFixed(2)}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Balanço</p>
              <p className="font-bold text-green-700">R$ {(totalIncome - totalExpense).toFixed(2)}</p>
            </div>
          </div>

          {/* Spending Report */}
          <div className="mb-6 p-4 bg-gray-100 rounded-lg">
            <h5 className="text-lg font-semibold text-gray-800 mb-2">Análise de Gastos:</h5>
            <p className="text-gray-700">{spendingReportMessage}</p>
          </div>

          {/* Transactions by Category */}
          <div className="mb-6">
            <h5 className="text-lg font-semibold text-gray-800 mb-2">Transações Detalhadas por Categoria:</h5>
            {Object.keys(groupedTransactions).length === 0 ? (
              <p className="text-gray-500">Nenhuma transação para este mês.</p>
            ) : (
              <div className="space-y-3">
                {Object.keys(groupedTransactions).map(categoryName => {
                  const categorySymbol = categories.find(cat => cat.name === categoryName)?.symbol || '❓';
                  const transactionsInCategory = groupedTransactions[categoryName].sort((a, b) => new Date(b.date) - new Date(a.date));
                  const totalCategory = transactionsInCategory.reduce((sum, t) => sum + parseFloat(t.value), 0);

                  return (
                    <div key={categoryName} className="bg-gray-50 p-3 rounded-lg shadow-sm">
                      <h6 className="text-md font-semibold text-gray-800 mb-1 flex items-center gap-1">
                        <span className="text-xl">{categorySymbol}</span> {categoryName} (Total: R$ {totalCategory.toFixed(2)})
                      </h6>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {transactionsInCategory.map(t => (
                          <li key={t.id} className="flex justify-between items-center border-b border-gray-100 last:border-b-0 py-0.5">
                            <span>{formatDate(t.date)} - {t.description}</span>
                            <span className={`font-medium ${t.type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                              {t.type === 'income' ? '+' : '-'} R$ {parseFloat(t.value).toFixed(2)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Expense Distribution Chart - Moved to the end */}
          <ExpenseChart transactions={monthlyTransactions} categories={categories} />
        </div>

        <div className="flex justify-end mt-6 gap-3">
          <button
            onClick={downloadPdf}
            className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold shadow-md hover:bg-green-700 transition duration-200"
          >
            Baixar PDF
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-300 text-gray-800 rounded-xl font-semibold shadow-md hover:bg-gray-400 transition duration-200"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}


// Confirmation Modal Component
function ConfirmationModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm text-center">
        <p className="text-lg font-semibold text-gray-800 mb-6">{message}</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-gray-300 text-gray-800 rounded-xl font-semibold shadow-md hover:bg-gray-400 transition duration-200"
          >
            Não
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold shadow-md hover:bg-red-700 transition duration-200"
          >
            Sim
          </button>
        </div>
      </div>
    </div>
  );
}

// MyGoals Component (New)
function MyGoals({ goals, addGoal, updateGoal, deleteGoal }) {
  const [goalName, setGoalName] = useState('');
  const [goalValue, setGoalValue] = useState('');
  const [goalCompletionDate, setGoalCompletionDate] = useState('');
  const [goalCurrentProgress, setGoalCurrentProgress] = useState('');
  const [editingGoal, setEditingGoal] = useState(null);

  useEffect(() => {
    if (editingGoal) {
      setGoalName(editingGoal.name);
      setGoalValue(editingGoal.targetValue);
      setGoalCompletionDate(editingGoal.completionDate);
      setGoalCurrentProgress(editingGoal.currentProgress);
    } else {
      setGoalName('');
      setGoalValue('');
      setGoalCompletionDate('');
      setGoalCurrentProgress('');
    }
  }, [editingGoal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!goalName || !goalValue || !goalCompletionDate) {
      alert("Por favor, preencha todos os campos da meta.");
      return;
    }

    const goalData = {
      name: goalName,
      targetValue: parseFloat(goalValue),
      completionDate: goalCompletionDate,
      currentProgress: parseFloat(goalCurrentProgress) || 0, // Default to 0 if not set
    };

    if (editingGoal) {
      await updateGoal(editingGoal.id, goalData);
    } else {
      await addGoal(goalData);
    }

    // Reset form
    setGoalName('');
    setGoalValue('');
    setGoalCompletionDate('');
    setGoalCurrentProgress('');
    setEditingGoal(null);
  };

  const handleEditClick = (goal) => {
    setEditingGoal(goal);
    setGoalName(goal.name);
    setGoalValue(goal.targetValue);
    setGoalCompletionDate(goal.completionDate);
    setGoalCurrentProgress(goal.currentProgress);
  };

  const handleProgressChange = async (goalId, newProgress) => {
    if (newProgress < 0) newProgress = 0;
    // Assuming targetValue is available in the goal object
    const goalToUpdate = goals.find(g => g.id === goalId);
    if (goalToUpdate && newProgress > goalToUpdate.targetValue) {
      newProgress = goalToUpdate.targetValue;
    }
    await updateGoal(goalId, { currentProgress: parseFloat(newProgress) });
  };

  return (
    <div className="bg-gray-50 p-6 rounded-2xl shadow-inner mb-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        {editingGoal ? 'Editar Meta' : 'Adicionar Nova Meta'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="goal-name" className="block text-gray-700 text-sm font-medium mb-2">Nome da Meta</label>
          <input
            type="text"
            id="goal-name"
            value={goalName}
            onChange={(e) => setGoalName(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
          />
        </div>
        <div>
          <label htmlFor="goal-value" className="block text-gray-700 text-sm font-medium mb-2">Valor da Meta (R$)</label>
          <input
            type="number"
            id="goal-value"
            value={goalValue}
            onChange={(e) => setGoalValue(e.target.value)}
            step="0.01"
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
          />
        </div>
        {/* Reverted to standard input type="date" */}
        <div>
          <label htmlFor="goal-completion-date" className="block text-gray-700 text-sm font-medium mb-2">Data para Conclusão</label>
          <input
            type="date"
            id="goal-completion-date"
            value={goalCompletionDate}
            onChange={(e) => setGoalCompletionDate(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
          />
        </div>
        {editingGoal && (
          <div>
            <label htmlFor="goal-current-progress" className="block text-gray-700 text-sm font-medium mb-2">Avanço Atual (R$)</label>
            <input
              type="number"
              id="goal-current-progress"
              value={goalCurrentProgress}
              onChange={(e) => setGoalCurrentProgress(e.target.value)}
              step="0.01"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
            />
          </div>
        )}
        <div className="flex justify-end gap-3">
          {editingGoal && (
            <button
              type="button"
              onClick={() => setEditingGoal(null)}
              className="px-6 py-3 bg-gray-400 text-white rounded-xl font-semibold shadow-md hover:bg-gray-500 transition duration-200"
            >
              Cancelar Edição
            </button>
          )}
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold shadow-md hover:bg-blue-700 transition duration-200"
          >
            {editingGoal ? 'Atualizar Meta' : 'Adicionar Meta'}
          </button>
        </div>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Minhas Metas</h3>
        {goals.length === 0 ? (
          <p className="text-center text-gray-500">Nenhuma meta adicionada ainda.</p>
        ) : (
          <ul className="space-y-4">
            {goals.sort((a, b) => new Date(b.completionDate) - new Date(a.completionDate)).map((goal) => ( // Sorting goals by completionDate
              <li key={goal.id} className="bg-white p-4 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-lg font-semibold text-gray-800">{goal.name}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditClick(goal)}
                      className="p-2 bg-yellow-500 text-white rounded-full shadow-md hover:bg-yellow-600 transition duration-200"
                      title="Editar Meta"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.38-2.828-2.828z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteGoal(goal.id)}
                      className="p-2 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700 transition duration-200"
                      title="Excluir Meta"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-gray-700">Valor: R$ {parseFloat(goal.targetValue).toFixed(2)}</p>
                <p className="text-gray-700">Concluir até: {formatDate(goal.completionDate)}</p>
                <div className="mt-2">
                  <label htmlFor={`progress-${goal.id}`} className="block text-gray-700 text-sm font-medium mb-1">Avanço: R$ {parseFloat(goal.currentProgress).toFixed(2)} de R$ {parseFloat(goal.targetValue).toFixed(2)}</label>
                  <input
                    type="range"
                    id={`progress-${goal.id}`}
                    min="0"
                    max={goal.targetValue}
                    value={goal.currentProgress}
                    onChange={(e) => handleProgressChange(goal.id, e.target.value)}
                    className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                    style={{ background: `linear-gradient(to right, #3B82F6 ${((goal.currentProgress / goal.targetValue) * 100)}%, #EBF8FF ${((goal.currentProgress / goal.targetValue) * 100)}%)` }}
                  />
                  <p className="text-sm text-gray-600 text-right">
                    {((goal.currentProgress / goal.targetValue) * 100).toFixed(1)}%
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// MyInvestments Component (New)
function MyInvestments({ investments, addInvestment, updateInvestment, deleteInvestment }) {
  const [investmentName, setInvestmentName] = useState('');
  const [initialValue, setInitialValue] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [assetType, setAssetType] = useState('cash'); // 'cash', 'stock', 'fund', 'treasury', 'stock_fund'
  const [initialQuantity, setInitialQuantity] = useState('');
  const [initialUnitPrice, setInitialUnitPrice] = useState('');

  const [editingInvestment, setEditingInvestment] = useState(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [transactionQuantity, setTransactionQuantity] = useState('');
  const [transactionUnitPrice, setTransactionUnitPrice] = useState('');

  // State to manage editing of projected value for each investment
  const [editingProjectedValueId, setEditingProjectedValueId] = useState(null);
  const [currentProjectedValueInput, setCurrentProjectedValueInput] = useState('');


  useEffect(() => {
    if (editingInvestment) {
      setInvestmentName(editingInvestment.name);
      setInitialValue(editingInvestment.initialValue);
      setStartDate(editingInvestment.startDate);
      setEndDate(editingInvestment.endDate || '');
      setMonthlyContribution(editingInvestment.monthlyContribution || '');
      setAssetType(editingInvestment.assetType || 'cash');
      setInitialQuantity(editingInvestment.initialQuantity || '');
      setInitialUnitPrice(editingInvestment.initialUnitPrice || '');
    } else {
      setInvestmentName('');
      setInitialValue('');
      setStartDate(new Date().toISOString().slice(0, 10));
      setEndDate('');
      setMonthlyContribution('');
      setAssetType('cash');
      setInitialQuantity('');
      setInitialUnitPrice('');
    }
  }, [editingInvestment]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!investmentName || !initialValue || !startDate) {
      alert("Por favor, preencha o nome, valor inicial e data de início do investimento.");
      return;
    }

    let currentVal = parseFloat(initialValue);
    let currentQty = parseFloat(initialQuantity) || 0;
    const unitPrice = parseFloat(initialUnitPrice) || null;

    if (assetType !== 'cash' && (!initialQuantity || !initialUnitPrice)) {
      alert("Para investimentos em ativos, por favor, insira a quantidade inicial e o preço unitário.");
      return;
    }
    if (assetType !== 'cash') {
      currentVal = currentQty * unitPrice; // Calculate initial value based on quantity and unit price
    }


    const investmentData = {
      name: investmentName,
      assetType: assetType,
      initialValue: parseFloat(initialValue), // Initial capital input by user
      currentValue: currentVal, // Calculated or set based on initialValue
      currentQuantity: currentQty,
      startDate,
      endDate: endDate || null,
      monthlyContribution: parseFloat(monthlyContribution) || 0,
      projectedValue: editingInvestment ? editingInvestment.projectedValue : 0, // Keep existing projected value or set to 0
      transactions: editingInvestment && Array.isArray(editingInvestment.transactions) ? editingInvestment.transactions : [ // Ensure transactions is an array
        {
          type: "aporte",
          amount: parseFloat(initialValue),
          date: startDate,
          quantity: currentQty,
          unitPrice: unitPrice,
          description: "Aporte Inicial"
        }
      ],
    };

    if (editingInvestment) {
      await updateInvestment(editingInvestment.id, investmentData);
    } else {
      await addInvestment(investmentData);
    }

    // Reset form
    setInvestmentName('');
    setInitialValue('');
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate('');
    setMonthlyContribution('');
    setAssetType('cash');
    setInitialQuantity('');
    setInitialUnitPrice('');
    setEditingInvestment(null);
  };

  const handleAddContribution = async (investment) => {
    const amount = parseFloat(contributionAmount);
    const quantity = parseFloat(transactionQuantity) || null;
    const unitPrice = parseFloat(transactionUnitPrice) || null;

    if (!amount || isNaN(amount) || amount <= 0) {
      alert("Por favor, insira um valor de aporte válido.");
      return;
    }

    if (investment.assetType !== 'cash' && (!quantity || isNaN(quantity) || quantity <= 0 || !unitPrice || isNaN(unitPrice) || unitPrice <= 0)) {
      alert("Para aportes em ativos, por favor, insira a quantidade e o preço unitário.");
      return;
    }

    let newCurrentValue = investment.currentValue;
    let newCurrentQuantity = investment.currentQuantity;

    if (investment.assetType === 'cash') {
      newCurrentValue += amount;
    } else {
      newCurrentQuantity += quantity;
      newCurrentValue = newCurrentQuantity * unitPrice; // Assuming current value is quantity * latest unit price
    }

    const newTransaction = {
      type: "aporte",
      amount: amount,
      date: new Date().toISOString().slice(0, 10),
      quantity: quantity,
      unitPrice: unitPrice,
      description: "Aporte"
    };

    const updatedTransactions = [...(investment.transactions || []), newTransaction]; // Ensure transactions is an array
    await updateInvestment(investment.id, {
      currentValue: newCurrentValue,
      currentQuantity: newCurrentQuantity,
      transactions: updatedTransactions
    });
    setContributionAmount('');
    setTransactionQuantity('');
    setTransactionUnitPrice('');
  };

  const handleMakeWithdrawal = async (investment) => {
    const amount = parseFloat(withdrawalAmount);
    const quantity = parseFloat(transactionQuantity) || null;
    const unitPrice = parseFloat(transactionUnitPrice) || null;

    if (!amount || isNaN(amount) || amount <= 0) {
      alert("Por favor, insira um valor de retirada válido.");
      return;
    }

    if (investment.assetType !== 'cash' && (!quantity || isNaN(quantity) || quantity <= 0 || !unitPrice || isNaN(unitPrice) || unitPrice <= 0)) {
      alert("Para retiradas de ativos, por favor, insira a quantidade e o preço unitário.");
      return;
    }

    let newCurrentValue = investment.currentValue;
    let newCurrentQuantity = investment.currentQuantity;

    if (investment.assetType === 'cash') {
      if (amount > newCurrentValue) {
        alert("O valor da retirada não pode ser maior que o valor atual do investimento.");
        return;
      }
      newCurrentValue -= amount;
    } else {
      if (quantity > newCurrentQuantity) {
        alert("A quantidade da retirada não pode ser maior que a quantidade atual do ativo.");
        return;
      }
      newCurrentQuantity -= quantity;
      newCurrentValue = newCurrentQuantity * unitPrice; // Assuming current value is quantity * latest unit price
    }


    const newTransaction = {
      type: "retirada",
      amount: amount,
      date: new Date().toISOString().slice(0, 10),
      quantity: quantity,
      unitPrice: unitPrice,
      description: "Retirada"
    };

    const updatedTransactions = [...(investment.transactions || []), newTransaction]; // Ensure transactions is an array
    await updateInvestment(investment.id, {
      currentValue: newCurrentValue,
      currentQuantity: newCurrentQuantity,
      transactions: updatedTransactions
    });
    setWithdrawalAmount('');
    setTransactionQuantity('');
    setTransactionUnitPrice('');
  };

  const handleEditProjectedValue = (investment) => {
    setEditingProjectedValueId(investment.id);
    setCurrentProjectedValueInput(investment.projectedValue.toString());
  };

  const handleSaveProjectedValue = async (investmentId) => {
    const parsedValue = parseFloat(currentProjectedValueInput);
    if (isNaN(parsedValue)) {
      alert("Por favor, insira um valor numérico válido para o Valor Projetado.");
      return;
    }
    await updateInvestment(investmentId, { projectedValue: parsedValue });
    setEditingProjectedValueId(null); // Exit editing mode
    setCurrentProjectedValueInput(''); // Clear input
  };

  const handleCancelProjectedValueEdit = () => {
    setEditingProjectedValueId(null); // Exit editing mode
    setCurrentProjectedValueInput(''); // Clear input
  };


  return (
    <div className="bg-gray-50 p-6 rounded-2xl shadow-inner mb-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        {editingInvestment ? 'Editar Investimento' : 'Adicionar Novo Investimento'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="investment-name" className="block text-gray-700 text-sm font-medium mb-2">Nome do Investimento</label>
          <input
            type="text"
            id="investment-name"
            value={investmentName}
            onChange={(e) => setInvestmentName(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
          />
        </div>
        <div>
          <label htmlFor="asset-type" className="block text-gray-700 text-sm font-medium mb-2">Tipo de Ativo</label>
          <select
            id="asset-type"
            value={assetType}
            onChange={(e) => setAssetType(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
          >
            <option value="cash">Dinheiro (Valor Total)</option>
            <option value="stock">Ações</option>
            <option value="fund">Fundos/FIIs</option>
            <option value="treasury">Tesouro Direto/Títulos Públicos</option>
            <option value="stock_fund">Ações + Fundos/FIIs</option> {/* New option */}
          </select>
        </div>
        <div>
          <label htmlFor="initial-value" className="block text-gray-700 text-sm font-medium mb-2">Valor Inicial (R$)</label>
          <input
            type="number"
            id="initial-value"
            value={initialValue}
            onChange={(e) => setInitialValue(e.target.value)}
            step="0.01"
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
          />
        </div>
        {assetType !== 'cash' && (
          <>
            <div>
              <label htmlFor="initial-quantity" className="block text-gray-700 text-sm font-medium mb-2">Quantidade Inicial</label>
              <input
                type="number"
                id="initial-quantity"
                value={initialQuantity}
                onChange={(e) => setInitialQuantity(e.target.value)}
                step="0.01"
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
              />
            </div>
            <div>
              <label htmlFor="initial-unit-price" className="block text-gray-700 text-sm font-medium mb-2">Preço Unitário Inicial (R$)</label>
              <input
                type="number"
                id="initial-unit-price"
                value={initialUnitPrice}
                onChange={(e) => setInitialUnitPrice(e.target.value)}
                step="0.01"
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
              />
            </div>
          </>
        )}
        {/* Reverted to standard input type="date" */}
        <div>
          <label htmlFor="start-date" className="block text-gray-700 text-sm font-medium mb-2">Data Inicial</label>
          <input
            type="date"
            id="start-date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
          />
        </div>
        {/* Reverted to standard input type="date" */}
        <div>
          <label htmlFor="end-date" className="block text-gray-700 text-sm font-medium mb-2">Data Final (Opcional)</label>
          <input
            type="date"
            id="end-date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
          />
        </div>
        <div>
          <label htmlFor="monthly-contribution" className="block text-gray-700 text-sm font-medium mb-2">Aporte Mensal (R$)</label>
          <input
            type="number"
            id="monthly-contribution"
            value={monthlyContribution}
            onChange={(e) => setMonthlyContribution(e.target.value)}
            step="0.01"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
          />
        </div>
        <div className="flex justify-end gap-3">
          {editingInvestment && (
            <button
              type="button"
              onClick={() => setEditingInvestment(null)}
              className="px-6 py-3 bg-gray-400 text-white rounded-xl font-semibold shadow-md hover:bg-gray-500 transition duration-200"
            >
              Cancelar Edição
            </button>
          )}
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold shadow-md hover:bg-blue-700 transition duration-200"
          >
            {editingInvestment ? 'Atualizar Investimento' : 'Adicionar Investimento'}
          </button>
        </div>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Meus Investimentos</h3>
        {investments.length === 0 ? (
          <p className="text-center text-gray-500">Nenhum investimento adicionado ainda.</p>
        ) : (
          <ul className="space-y-6">
            {investments.map((investment) => (
              <li key={investment.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xl font-bold text-gray-800">{investment.name}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingInvestment(investment)}
                      className="p-2 bg-yellow-500 text-white rounded-full shadow-md hover:bg-yellow-600 transition duration-200"
                      title="Editar Investimento"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.38-2.828-2.828z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteInvestment(investment.id)}
                      className="p-2 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700 transition duration-200"
                      title="Excluir Investimento"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-700 text-sm mb-4">
                  <p><strong>Tipo:</strong> {investment.assetType === 'cash' ? 'Dinheiro' : investment.assetType === 'stock' ? 'Ações' : investment.assetType === 'fund' ? 'Fundos/FIIs' : investment.assetType === 'stock_fund' ? 'Ações + Fundos/FIIs' : 'Tesouro/Títulos'}</p>
                  <p><strong>Valor Inicial:</strong> R$ {parseFloat(investment.initialValue).toFixed(2)}</p>
                  <p><strong>Valor Atual:</strong> R$ {parseFloat(investment.currentValue).toFixed(2)}</p>
                  {investment.assetType !== 'cash' && (
                    <p><strong>Quantidade Atual:</strong> {parseFloat(investment.currentQuantity).toFixed(2)}</p>
                  )}
                  <p><strong>Data Inicial:</strong> {formatDate(investment.startDate)}</p>
                  {investment.endDate && <p><strong>Data Final:</strong> {formatDate(investment.endDate)}</p>}
                  {investment.monthlyContribution > 0 && <p><strong>Aporte Mensal:</strong> R$ {parseFloat(investment.monthlyContribution).toFixed(2)}</p>}
                </div>

                {/* Aporte e Retirada */}
                <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-800 mb-2">Registrar Operação</h4>
                  <div className="flex flex-col gap-2">
                    <input
                      type="number"
                      placeholder="Valor (R$)"
                      value={contributionAmount}
                      onChange={(e) => setContributionAmount(e.target.value)}
                      step="0.01"
                      className="p-2 border border-gray-300 rounded-lg"
                    />
                    {investment.assetType !== 'cash' && (
                      <>
                        <input
                          type="number"
                          placeholder="Quantidade"
                          value={transactionQuantity}
                          onChange={(e) => setTransactionQuantity(e.target.value)}
                          step="0.01"
                          className="p-2 border border-gray-300 rounded-lg"
                        />
                        <input
                          type="number"
                          placeholder="Preço Unitário (R$)"
                          value={transactionUnitPrice}
                          onChange={(e) => setTransactionUnitPrice(e.target.value)}
                          step="0.01"
                          className="p-2 border border-gray-300 rounded-lg"
                        />
                      </>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAddContribution(investment)}
                        className="bg-green-500 text-white py-2 rounded-lg shadow-md hover:bg-green-600 transition duration-200"
                      >
                        Aportar
                      </button>
                      <button
                        onClick={() => handleMakeWithdrawal(investment)}
                        className="flex-1 bg-red-500 text-white py-2 rounded-lg shadow-md hover:bg-red-600 transition duration-200"
                      >
                        Retirar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Histórico de Transações */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-md font-semibold text-gray-800 mb-2">Histórico de Transações</h4>
                  {investment.transactions && investment.transactions.length > 0 ? (
                    <ul className="space-y-1 text-sm text-gray-700 max-h-32 overflow-y-auto">
                      {investment.transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).map((t, index) => (
                        <li key={index} className={`flex justify-between items-center py-1 ${t.type === 'aporte' ? 'text-green-700' : 'text-red-700'}`}>
                          <span>
                            {formatDate(t.date)} - {t.type === 'aporte' ? 'Aporte' : 'Retirada'}: R$ {parseFloat(t.amount).toFixed(2)}
                            {t.quantity && t.unitPrice && ` (Fração: ${parseFloat(t.quantity).toFixed(2)}, Valor Unitário: R$ ${parseFloat(t.unitPrice).toFixed(2)})`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm">Nenhuma transação registrada para este investimento.</p>
                  )}
                </div>

                {/* Projeção Futura - agora com botão de editar */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-md font-semibold text-gray-800 mb-2">Projeção Futura</h4>
                  {editingProjectedValueId === investment.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Valor Projetado (R$)"
                        value={currentProjectedValueInput}
                        onChange={(e) => setCurrentProjectedValueInput(e.target.value)}
                        step="0.01"
                        className="w-full p-2 border border-gray-300 rounded-lg flex-grow"
                      />
                      <button
                        onClick={() => handleSaveProjectedValue(investment.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition duration-200"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => handleCancelProjectedValueEdit()}
                        className="px-4 py-2 bg-gray-400 text-white rounded-lg shadow-md hover:bg-gray-500 transition duration-200"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <p className="text-lg font-bold text-blue-700">
                        R$ {parseFloat(investment.projectedValue).toFixed(2)}
                      </p>
                      <button
                        onClick={() => handleEditProjectedValue(investment)}
                        className="p-2 bg-yellow-500 text-white rounded-full shadow-md hover:bg-yellow-600 transition duration-200"
                        title="Editar Projeção"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.38-2.828-2.828z" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// MyEmergencyReserves Component (New)
function MyEmergencyReserves({ emergencyReserves, addEmergencyReserve, updateEmergencyReserve, deleteEmergencyReserve }) {
  const [reserveName, setReserveName] = useState('');
  const [initialValue, setInitialValue] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [contributionAmount, setContributionAmount] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalJustification, setWithdrawalJustification] = useState('');
  const [editingReserve, setEditingReserve] = useState(null);

  useEffect(() => {
    if (editingReserve) {
      setReserveName(editingReserve.name);
      setInitialValue(editingReserve.initialValue);
      setStartDate(editingReserve.startDate);
    } else {
      setReserveName('');
      setInitialValue('');
      setStartDate(new Date().toISOString().slice(0, 10));
    }
  }, [editingReserve]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reserveName || !initialValue || !startDate) {
      alert("Por favor, preencha o nome, valor inicial e data inicial da reserva.");
      return;
    }

    const reserveData = {
      name: reserveName,
      initialValue: parseFloat(initialValue),
      currentValue: parseFloat(initialValue),
      startDate,
      transactions: editingReserve && Array.isArray(editingReserve.transactions) ? editingReserve.transactions : [],
    };

    if (editingReserve) {
      await updateEmergencyReserve(editingReserve.id, reserveData);
    } else {
      await addEmergencyReserve(reserveData);
    }

    // Reset form
    setReserveName('');
    setInitialValue('');
    setStartDate(new Date().toISOString().slice(0, 10));
    setEditingReserve(null);
  };

  const handleAddContribution = async (reserve) => {
    const amount = parseFloat(contributionAmount);
    if (!amount || isNaN(amount) || amount <= 0) {
      alert("Por favor, insira um valor de aporte válido.");
      return;
    }

    const newCurrentValue = reserve.currentValue + amount;
    const newTransaction = {
      type: "aporte",
      amount: amount,
      date: new Date().toISOString().slice(0, 10),
      description: "Aporte"
    };

    const updatedTransactions = [...(reserve.transactions || []), newTransaction];
    await updateEmergencyReserve(reserve.id, {
      currentValue: newCurrentValue,
      transactions: updatedTransactions
    });
    setContributionAmount('');
  };

  const handleMakeWithdrawal = async (reserve) => {
    const amount = parseFloat(withdrawalAmount);
    if (!amount || isNaN(amount) || amount <= 0) {
      alert("Por favor, insira um valor de retirada válido.");
      return;
    }
    if (!withdrawalJustification.trim()) {
      alert("Por favor, insira uma justificativa para a retirada.");
      return;
    }
    if (amount > reserve.currentValue) {
      alert("O valor da retirada não pode ser maior que o valor atual da reserva.");
      return;
      }

    const newCurrentValue = reserve.currentValue - amount;
    const newTransaction = {
      type: "retirada",
      amount: amount,
      date: new Date().toISOString().slice(0, 10),
      justification: withdrawalJustification.trim(),
      description: "Retirada"
    };

    const updatedTransactions = [...(reserve.transactions || []), newTransaction];
    await updateEmergencyReserve(reserve.id, {
      currentValue: newCurrentValue,
      transactions: updatedTransactions
    });
    setWithdrawalAmount('');
    setWithdrawalJustification('');
  };

  return (
    <div className="bg-gray-50 p-6 rounded-2xl shadow-inner mb-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        {editingReserve ? 'Editar Reserva de Emergência' : 'Adicionar Nova Reserva de Emergência'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="reserve-name" className="block text-gray-700 text-sm font-medium mb-2">Nome da Reserva</label>
          <input
            type="text"
            id="reserve-name"
            value={reserveName}
            onChange={(e) => setReserveName(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
          />
        </div>
        <div>
          <label htmlFor="initial-value-reserve" className="block text-gray-700 text-sm font-medium mb-2">Valor Inicial (R$)</label>
          <input
            type="number"
            id="initial-value-reserve"
            value={initialValue}
            onChange={(e) => setInitialValue(e.target.value)}
            step="0.01"
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
          />
        </div>
        {/* Reverted to standard input type="date" */}
        <div>
          <label htmlFor="start-date-reserve" className="block text-gray-700 text-sm font-medium mb-2">Data Inicial</label>
          <input
            type="date"
            id="start-date-reserve"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
          />
        </div>
        <div className="flex justify-end gap-3">
          {editingReserve && (
            <button
              type="button"
              onClick={() => setEditingReserve(null)}
              className="px-6 py-3 bg-gray-400 text-white rounded-xl font-semibold shadow-md hover:bg-gray-500 transition duration-200"
            >
              Cancelar Edição
            </button>
          )}
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold shadow-md hover:bg-blue-700 transition duration-200"
          >
            {editingReserve ? 'Atualizar Reserva' : 'Adicionar Reserva'}
          </button>
        </div>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Minhas Reservas de Emergência</h3>
        {emergencyReserves.length === 0 ? (
          <p className="text-center text-gray-500">Nenhuma reserva de emergência adicionada ainda.</p>
        ) : (
          <ul className="space-y-6">
            {emergencyReserves.map((reserve) => (
              <li key={reserve.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xl font-bold text-gray-800">{reserve.name}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingReserve(reserve)}
                      className="p-2 bg-yellow-500 text-white rounded-full shadow-md hover:bg-yellow-600 transition duration-200"
                      title="Editar Reserva"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.38-2.828-2.828z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteEmergencyReserve(reserve.id)}
                      className="p-2 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700 transition duration-200"
                      title="Excluir Reserva"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-700 text-sm mb-4">
                  <p><strong>Valor Inicial:</strong> R$ {parseFloat(reserve.initialValue).toFixed(2)}</p>
                  <p><strong>Valor Atual:</strong> R$ {parseFloat(reserve.currentValue).toFixed(2)}</p>
                  <p><strong>Data Inicial:</strong> {formatDate(reserve.startDate)}</p>
                </div>

                {/* Aporte e Retirada */}
                <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-800 mb-2">Registrar Operação</h4>
                  <div className="flex flex-col gap-2">
                    <input
                      type="number"
                      placeholder="Valor do Aporte (R$)"
                      value={contributionAmount}
                      onChange={(e) => setContributionAmount(e.target.value)}
                      step="0.01"
                      className="p-2 border border-gray-300 rounded-lg"
                    />
                    <button
                      onClick={() => handleAddContribution(reserve)}
                      className="bg-green-500 text-white py-2 rounded-lg shadow-md hover:bg-green-600 transition duration-200"
                    >
                      Realizar Aporte
                    </button>
                    <input
                      type="number"
                      placeholder="Valor da Retirada (R$)"
                      value={withdrawalAmount}
                      onChange={(e) => setWithdrawalAmount(e.target.value)}
                      step="0.01"
                      className="p-2 border border-gray-300 rounded-lg"
                    />
                    <textarea
                      placeholder="Justificativa da Retirada"
                      value={withdrawalJustification}
                      onChange={(e) => setWithdrawalJustification(e.target.value)}
                      rows="2"
                      className="p-2 border border-gray-300 rounded-lg resize-y"
                    ></textarea>
                    <button
                      onClick={() => handleMakeWithdrawal(reserve)}
                      className="bg-red-500 text-white py-2 rounded-lg shadow-md hover:bg-red-600 transition duration-200"
                    >
                      Realizar Retirada
                    </button>
                  </div>
                </div>

                {/* Histórico de Transações */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-md font-semibold text-gray-800 mb-2">Histórico de Transações</h4>
                  {reserve.transactions && reserve.transactions.length > 0 ? (
                    <ul className="space-y-1 text-sm text-gray-700 max-h-32 overflow-y-auto">
                      {reserve.transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).map((t, index) => (
                        <li key={index} className={`flex justify-between items-center py-1 ${t.type === 'aporte' ? 'text-green-700' : 'text-red-700'}`}>
                          <span>
                            {formatDate(t.date)} - {t.type === 'aporte' ? 'Aporte' : 'Retirada'}: R$ {parseFloat(t.amount).toFixed(2)}
                            {t.justification && ` (Justificativa: ${t.justification})`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm">Nenhuma transação registrada para esta reserva.</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Expense Chart Component (New)
function ExpenseChart({ transactions, categories }) {
  const svgRef = useRef();

  useEffect(() => {
    // Filter for expenses only
    const expenses = transactions.filter(t => t.type === 'expense');

    // Group expenses by category and sum values
    const data = d3.rollup(
      expenses,
      v => d3.sum(v, d => parseFloat(d.value)),
      d => d.category
    );

    const chartData = Array.from(data, ([category, value]) => ({ category, value }));

    // Get category symbols for labels
    const getCategorySymbol = (categoryName) => {
      const category = categories.find(cat => cat.name === categoryName);
      return category ? category.symbol : '❓';
    };

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    if (chartData.length === 0) {
      d3.select(svgRef.current)
        .append("text")
        .attr("x", "50%")
        .attr("y", "50%")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", "1.2rem")
        .attr("fill", "#6B7280")
        .text("Nenhum gasto para exibir neste mês.");
      return;
    }

    const width = 400;
    const height = 400;
    const radius = Math.min(width, height) / 2;

    const svg = d3.select(svgRef.current)
      .attr("width", "100%") // Make it responsive
      .attr("height", "100%") // Make it responsive
      .attr("viewBox", `0 0 ${width} ${height}`) // Set viewBox for scaling
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const pie = d3.pie()
      .value(d => d.value)
      .sort(null);

    const arc = d3.arc()
      .innerRadius(0)
      .outerRadius(radius);

    const color = d3.scaleOrdinal(d3.schemeCategory10); // Or a custom color scale

    const arcs = svg.selectAll(".arc")
      .data(pie(chartData))
      .enter()
      .append("g")
      .attr("class", "arc");

    arcs.append("path")
      .attr("d", arc)
      .attr("fill", (d, i) => color(i))
      .attr("stroke", "white")
      .style("stroke-width", "2px")
      .style("opacity", 0.8);

    arcs.append("text")
      .attr("transform", d => `translate(${arc.centroid(d)})`)
      .attr("text-anchor", "middle")
      .attr("font-size", "0.8rem")
      .attr("fill", "white")
      .text(d => {
        const percentage = (d.data.value / d3.sum(chartData, c => c.value)) * 100;
        return `${getCategorySymbol(d.data.category)} ${d.data.category}: ${percentage.toFixed(1)}%`;
      });

  }, [transactions, categories]); // Re-run effect if transactions or categories change

  return (
    <div className="bg-gray-50 p-6 rounded-2xl shadow-inner mb-8 flex flex-col items-center">
      <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Distribuição de Gastos por Categoria</h3>
      <div className="w-full max-w-md h-80 flex items-center justify-center"> {/* Fixed height container for SVG */}
        <svg ref={svgRef} className="w-full h-full"></svg>
      </div>
    </div>
  );
}

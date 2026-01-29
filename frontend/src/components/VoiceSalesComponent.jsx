// frontend/src/components/VoiceSalesComponent.jsx - SMART AUTO-CREATION VERSION

import { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, Trash2, Loader, AlertCircle, CheckCircle,
  Volume2, StopCircle, Package, DollarSign, TrendingUp,
  Calendar, CreditCard, Wallet, ShoppingBag, Info, X, Plus
} from 'lucide-react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatQuantityWithUnit = (quantity, unit) => {
  const qty = parseFloat(quantity);
  if (unit === 'meters') return qty % 1 === 0 ? `${qty}m` : `${qty.toFixed(2)}m`;
  if (unit === 'yards') return qty % 1 === 0 ? `${qty}y` : `${qty.toFixed(2)}y`;
  return Math.floor(qty);
};

const getItemCount = (quantity, unit) => {
  if (unit === 'meters' || unit === 'yards') return 1;
  return parseFloat(quantity);
};

const VoiceSalesComponent = () => {
  const [varieties, setVarieties] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [examples, setExamples] = useState(null);
  const [showExamples, setShowExamples] = useState(false);
  const { user } = useAuth();

  // Voice states
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  const [recordingQueue, setRecordingQueue] = useState([]); // Queue of recordings
  const [processingCount, setProcessingCount] = useState(0); // How many processing
  const [recentResults, setRecentResults] = useState([]); // Last 3 results
  const [recordingNumber, setRecordingNumber] = useState(1); // Counter

  const [autoSubmit, setAutoSubmit] = useState(true); // NEW
  const [processingQueue, setProcessingQueue] = useState([]); // NEW
  const [lastSaleId, setLastSaleId] = useState(null); // NEW for undo



  useEffect(() => {
    loadVarieties();
    loadSales();
    loadExamples();
  }, [selectedDate]);

  const loadVarieties = async () => {
    try {
      const response = await api.get('/varieties/');
      setVarieties(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading varieties:', error);
    }
  };

  const loadSales = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/sales/date/${selectedDate}`);
      setSales(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExamples = async () => {
    try {
      const response = await api.get('/sales/voice/examples');
      setExamples(response.data);
    } catch (error) {
      console.error('Error loading examples:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this sale? Stock will be restored if applicable.')) return;
    try {
      await api.delete(`/sales/${id}`);
      loadSales();
      loadVarieties();
      setSuccessMessage('Sale deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting sale:', error);
      setError('Failed to delete sale');
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      setTranscript('');
      // setValidationResult(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('Failed to access microphone. Please check permissions.');
      console.error('Microphone error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // INSTANT: Ready for next recording immediately
      // Processing happens in background via mediaRecorder.onstop
    }
  };


  // Updated processAudio - non-blocking background processing
  const processAudio = async (audioBlob) => {
    const recordingId = recordingNumber;
    setRecordingNumber(prev => prev + 1);
    setProcessingCount(prev => prev + 1);

    // Add to processing queue
    setRecordingQueue(prev => [...prev, {
      id: recordingId,
      status: 'transcribing',
      timestamp: new Date()
    }]);

    try {
      // Step 1: Transcribe
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const transcribeResponse = await api.post('/sales/voice/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const transcribeData = transcribeResponse.data;

      // Update queue status
      setRecordingQueue(prev => prev.map(item => 
        item.id === recordingId 
          ? { ...item, status: 'validating', transcript: transcribeData.transcript }
          : item
      ));

      // Step 2: Validate
      const validateResponse = await api.post('/sales/voice/validate', {
        transcript: transcribeData.transcript
      });

      const validationData = validateResponse.data;

      if (!validationData.success) {
        // Mark as error
        setRecordingQueue(prev => prev.map(item => 
          item.id === recordingId 
            ? { ...item, status: 'error', error: validationData.message }
            : item
        ));
        setProcessingCount(prev => prev - 1);
        
        // Add to recent results
        addRecentResult({
          id: recordingId,
          type: 'error',
          message: validationData.message,
          transcript: transcribeData.transcript
        });
        return;
      }

      // Update to submitting
      setRecordingQueue(prev => prev.map(item => 
        item.id === recordingId 
          ? { ...item, status: 'submitting', data: validationData }
          : item
      ));

      // Step 3: Submit
      const response = await api.post('/sales/voice/record-sale', validationData.sale_data);

      // Success!
      setRecordingQueue(prev => prev.filter(item => item.id !== recordingId));
      setProcessingCount(prev => prev - 1);

      addRecentResult({
        id: recordingId,
        type: 'success',
        message: response.data.message,
        transcript: transcribeData.transcript,
        saleId: response.data.sale_id,
        profit: response.data.total_profit
      });

      loadSales();
      loadVarieties();

    } catch (err) {
      setRecordingQueue(prev => prev.filter(item => item.id !== recordingId));
      setProcessingCount(prev => prev - 1);

      let errorMessage = 'Failed to process';
      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }

      addRecentResult({
        id: recordingId,
        type: 'error',
        message: errorMessage,
        transcript: 'Processing failed'
      });
    }
  };

  // Helper to add recent results (keep last 5)
  const addRecentResult = (result) => {
    setRecentResults(prev => [result, ...prev].slice(0, 5));
    
    // Auto-clear success messages after 5 seconds
    if (result.type === 'success') {
      setTimeout(() => {
        setRecentResults(prev => prev.filter(r => r.id !== result.id));
      }, 5000);
    }
  };

  // NEW: Auto-confirm and submit
  const autoConfirmAndSubmit = async (validationData) => {
    try {
      const response = await api.post('/sales/voice/record-sale', validationData.sale_data);

      setLastSaleId(response.data.sale_id); // For undo

      let msg = '✅ Sale recorded!';
      if (response.data.variety_created) msg += ' New variety created.';
      if (response.data.inventory_created) msg += ' Inventory added.';

      setSuccessMessage(msg);
      setTranscript('');
      setValidationResult(null);
      loadSales();
      loadVarieties();

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to record sale');
    }
  };

  // NEW: Undo last sale
  const undoLastSale = async () => {
    if (!lastSaleId) return;

    if (!confirm('Undo the last sale?')) return;

    try {
      await handleDelete(lastSaleId);
      setLastSaleId(null);
      setSuccessMessage('Last sale undone!');
    } catch (err) {
      setError('Failed to undo sale');
    }
  };

  const confirmAndSubmit = async () => {
    if (!validationResult || !validationResult.sale_data) return;

    setIsProcessing(true);
    try {
      const response = await api.post('/sales/voice/record-sale', validationResult.sale_data);

      // Build success message (like SaleForm)
      let msg = '🎉 Voice sale recorded successfully!';
      if (response.data.variety_created) {
        msg += ` New variety "${validationResult.variety_name}" created.`;
      }
      if (response.data.inventory_created) {
        msg += ' Inventory auto-created.';
      }

      setSuccessMessage(msg);
      setTranscript('');
      setValidationResult(null);
      loadSales();
      loadVarieties();

      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to record sale');
    } finally {
      setIsProcessing(false);
    }
  };

  const cancelValidation = () => {
    setTranscript('');
    setValidationResult(null);
    setError(null);
  };

  const totalSales = sales.reduce((sum, item) => sum + (parseFloat(item.selling_price) * item.quantity), 0);
  const totalProfit = sales.reduce((sum, item) => sum + parseFloat(item.profit), 0);
  const totalItemsSold = sales.reduce((sum, item) => {
    return sum + getItemCount(item.quantity, item.variety.measurement_unit);
  }, 0);

return (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-3 sm:p-4 md:p-6">
    <div className="max-w-7xl mx-auto">

      {/* HEADER */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
          <div className="flex-1">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">
              Voice Sales - Quick Mode
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              Keep recording - we'll process in background ⚡
            </p>
          </div>

          {/* Processing indicator */}
          {processingCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
              <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                Processing {processingCount} sale{processingCount > 1 ? 's' : ''}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 sm:px-4 py-2">
            <Calendar size={18} className="text-gray-500 dark:text-gray-400 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-gray-800 dark:text-gray-100 focus:outline-none text-sm sm:text-base w-full"
            />
          </div>
        </div>
      </div>

      {/* RECORDING BUTTON - Always Ready */}
      <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 md:p-8 mb-4">
        <div className="flex justify-center">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`relative w-32 h-32 sm:w-40 sm:h-40 rounded-full flex items-center justify-center transition-all duration-300 ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                : 'bg-blue-500 hover:bg-blue-600 hover:scale-105'
            } cursor-pointer shadow-lg active:scale-95`}
          >
            {isRecording ? (
              <div className="flex flex-col items-center">
                <StopCircle className="text-white" size={48} />
                <span className="text-white text-sm mt-2 font-medium">Stop</span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Mic className="text-white" size={48} />
                <span className="text-white text-sm mt-2 font-medium">
                  {processingCount > 0 ? 'Next Sale' : 'Start'}
                </span>
              </div>
            )}
          </button>
        </div>

        {isRecording && (
          <div className="text-center mt-4">
            <p className="text-sm sm:text-base text-red-600 dark:text-red-400 font-medium flex items-center justify-center gap-2">
              <Volume2 size={20} className="animate-pulse" />
              Recording... Speak now
            </p>
          </div>
        )}

        {/* Quick Stats */}
        {processingCount === 0 && recentResults.length === 0 && (
          <div className="text-center mt-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ready to record. Speak naturally - we'll handle the rest!
            </p>
          </div>
        )}
      </div>

      {/* RECENT RESULTS - Compact Toast-style */}
      {recentResults.length > 0 && (
        <div className="mb-4 space-y-2">
          {recentResults.map((result) => (
            <div
              key={result.id}
              className={`p-3 rounded-lg border animate-slide-in ${
                result.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {result.type === 'success' ? (
                    <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertCircle size={16} className="text-red-600 dark:text-red-400" />
                  )}
                  <span className={`text-sm font-medium ${
                    result.type === 'success'
                      ? 'text-green-800 dark:text-green-200'
                      : 'text-red-800 dark:text-red-200'
                  }`}>
                    {result.message}
                  </span>
                </div>
                {result.profit && (
                  <span className="text-sm font-bold text-green-700 dark:text-green-400">
                    +₹{result.profit.toFixed(2)}
                  </span>
                )}
              </div>
              {result.transcript && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                  "{result.transcript}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}

        {/* SALES TABLE */}
        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">
            Today's Sales
          </h3>

          {loading ? (
            <div className="flex justify-center py-8 sm:py-10">
              <Loader className="animate-spin text-gray-400 dark:text-gray-500" size={32} />
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-8 sm:py-10 text-gray-500 dark:text-gray-400">
              <Package size={40} className="sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-sm sm:text-base">No sales records for this date</p>
            </div>
          ) : (
            <>
              {/* SUMMARY CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <Package className="text-blue-600 dark:text-blue-400 shrink-0" size={20} />
                    <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium">
                      Items Sold
                    </p>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {totalItemsSold}
                  </p>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <DollarSign className="text-purple-600 dark:text-purple-400 shrink-0" size={20} />
                    <p className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 font-medium">
                      Total Sales
                    </p>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-purple-900 dark:text-purple-100">
                    ₹{totalSales.toFixed(2)}
                  </p>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <TrendingUp className="text-green-600 dark:text-green-400 shrink-0" size={20} />
                    <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-medium">
                      Total Profit
                    </p>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-green-900 dark:text-green-100">
                    ₹{totalProfit.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* MOBILE: CARD LAYOUT */}
              <div className="block lg:hidden space-y-3">
                {sales.map((item) => (
                  <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-gray-100 text-sm capitalize truncate">
                          {item.salesperson_name}
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 truncate">
                          {item.variety.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-0.5">
                          {item.variety.measurement_unit}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition shrink-0 active:scale-95"
                        aria-label="Delete sale"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${item.payment_status === 'paid'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                        }`}>
                        {item.payment_status === 'paid' ? '✓ Paid' : '⏱ Loan'}
                      </span>

                      {item.customer_name && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                          {item.customer_name}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Qty:</span>
                        <div className="font-medium text-gray-700 dark:text-gray-300">
                          {formatQuantityWithUnit(item.quantity, item.variety.measurement_unit)}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Sale:</span>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          ₹{(parseFloat(item.selling_price) * item.quantity).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Profit:</span>
                        <div className="font-semibold text-green-600 dark:text-green-400">
                          ₹{parseFloat(item.profit).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Time:</span>
                        <div className="text-gray-700 dark:text-gray-300">
                          {new Date(item.sale_timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP: TABLE LAYOUT */}
              <div className="hidden lg:block overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Salesperson</th>
                      <th className="px-4 py-3 text-left font-semibold">Variety</th>
                      <th className="px-4 py-3 text-center font-semibold">Payment</th>
                      <th className="px-4 py-3 text-center font-semibold">Qty</th>
                      <th className="px-4 py-3 text-right font-semibold">Sale</th>
                      <th className="px-4 py-3 text-right font-semibold">Profit</th>
                      <th className="px-4 py-3 text-center font-semibold">Time</th>
                      <th className="px-4 py-3 text-center font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {sales.map((item, idx) => (
                      <tr
                        key={item.id}
                        className={`border-t border-gray-200 dark:border-gray-700 ${idx % 2 === 0
                          ? 'bg-white dark:bg-gray-800'
                          : 'bg-gray-50 dark:bg-gray-700'
                          } hover:bg-gray-100 dark:hover:bg-gray-600 transition`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200 capitalize">
                          {item.salesperson_name}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800 dark:text-gray-200">
                            {item.variety.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                            {item.variety.measurement_unit}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${item.payment_status === 'paid'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                            }`}>
                            {item.payment_status === 'paid' ? '✓ Paid' : '⏱ Loan'}
                          </span>
                          {item.customer_name && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {item.customer_name}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-gray-800 dark:text-gray-200">
                          {formatQuantityWithUnit(item.quantity, item.variety.measurement_unit)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">
                          ₹{(parseFloat(item.selling_price) * item.quantity).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600 dark:text-green-400">
                          ₹{parseFloat(item.profit).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400 text-xs">
                          {new Date(item.sale_timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
          {/* CSS for animations */}
    <style>{`
      @keyframes slide-in {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      .animate-slide-in {
        animation: slide-in 0.3s ease-out;
      }
    `}</style>
    </div>

    
  );
};

export default VoiceSalesComponent;
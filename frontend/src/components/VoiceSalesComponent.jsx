// frontend/src/components/VoiceSalesComponent.jsx - SMART AUTO-CREATION VERSION

import { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, Trash2, Loader, AlertCircle, CheckCircle,
  Volume2, StopCircle, Package, DollarSign, TrendingUp,
  Calendar, CreditCard, Wallet, ShoppingBag, Info, X, Plus
} from 'lucide-react';
import api from '../api/api';
import { useAuth } from '../App';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

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
      setValidationResult(null);

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
    }
  };

  const processAudio = async (audioBlob) => {
    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const transcribeResponse = await api.post('/sales/voice/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const transcribeData = transcribeResponse.data;
      setTranscript(transcribeData.transcript);

      const validateResponse = await api.post('/sales/voice/validate', {
        transcript: transcribeData.transcript
      });

      const validationData = validateResponse.data;

      if (!validationData.success) {
        setError(validationData.message || 'Failed to understand command');
        setValidationResult(null);
        return;
      }

      setValidationResult(validationData);

    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to process audio');
      console.error('Processing error:', err);
    } finally {
      setIsProcessing(false);
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
                Voice Command Sales
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                Record sales naturally using your voice - auto-creates varieties & inventory
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => setShowExamples(!showExamples)}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition active:scale-95"
              >
                <Info size={18} />
                <span className="text-sm font-medium">Examples</span>
              </button>

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
        </div>

        {/* EXAMPLES PANEL */}
        {showExamples && examples && (
          <div className="mb-4 sm:mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg sm:rounded-xl p-4 sm:p-6">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-bold text-blue-900 dark:text-blue-100">
                Voice Command Examples
              </h3>
              <button
                onClick={() => setShowExamples(false)}
                className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition lg:hidden"
                aria-label="Close examples"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                  Basic Sales
                </h4>
                <ul className="space-y-2">
                  {examples.basic_examples.map((ex, i) => (
                    <li key={i} className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-2.5 sm:p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                      "{ex}"
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                  Loan/Credit Sales
                </h4>
                <ul className="space-y-2">
                  {examples.loan_examples.map((ex, i) => (
                    <li key={i} className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-2.5 sm:p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                      "{ex}"
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                  Tips
                </h4>
                <ul className="space-y-2">
                  {examples.tips.map((tip, i) => (
                    <li key={i} className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* SUCCESS MESSAGE */}
        {successMessage && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 sm:gap-3">
            <CheckCircle className="text-green-600 dark:text-green-400 shrink-0" size={20} />
            <p className="text-sm sm:text-base text-green-800 dark:text-green-200 font-medium">
              {successMessage}
            </p>
          </div>
        )}

        {/* VOICE COMMAND SECTION */}
        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 md:p-8 mb-4 sm:mb-6">
          <div className="text-center mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              Voice Command
            </h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Click the microphone and speak naturally. AI will extract all details and auto-create varieties if needed.
            </p>
          </div>

          {/* RECORDING BUTTON */}
          <div className="flex justify-center mb-4 sm:mb-6">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center transition-all duration-300 ${isRecording
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                  : 'bg-blue-500 hover:bg-blue-600 hover:scale-105'
                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer shadow-lg active:scale-95'}`}
            >
              {isProcessing ? (
                <Loader className="text-white animate-spin" size={40} />
              ) : isRecording ? (
                <div className="flex flex-col items-center">
                  <StopCircle className="text-white" size={40} />
                  <span className="text-white text-xs mt-2 font-medium">Stop</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Mic className="text-white" size={40} />
                  <span className="text-white text-xs mt-2 font-medium">Start</span>
                </div>
              )}
            </button>
          </div>

          {/* STATUS MESSAGES */}
          {isRecording && (
            <div className="text-center mb-4">
              <p className="text-sm sm:text-base text-red-600 dark:text-red-400 font-medium flex items-center justify-center gap-2">
                <Volume2 size={20} className="animate-pulse" />
                Listening... Speak now
              </p>
            </div>
          )}

          {isProcessing && (
            <div className="text-center mb-4">
              <p className="text-sm sm:text-base text-blue-600 dark:text-blue-400 font-medium flex items-center justify-center gap-2">
                <Loader size={20} className="animate-spin" />
                Processing with AI...
              </p>
            </div>
          )}

          {/* TRANSCRIPT */}
          {transcript && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium mb-2">
                Transcript:
              </p>
              <p className="text-sm sm:text-base text-gray-800 dark:text-gray-200">{transcript}</p>
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2 sm:gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" size={20} />
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-base text-red-800 dark:text-red-200 font-medium">Error</p>
                <p className="text-xs sm:text-sm text-red-700 dark:text-red-300 mt-1 wrap-break-word">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* VALIDATION RESULT */}
          {validationResult && validationResult.success && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 sm:pt-6">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 sm:p-6 mb-4">
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <CheckCircle className="text-green-600 dark:text-green-400 shrink-0" size={24} />
                  <h4 className="text-base sm:text-lg font-bold text-green-800 dark:text-green-100">
                    Command Understood!
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 mb-1">Salesperson:</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 wrap-break-word">
                      {user?.full_name || 'You'}  {/* ← NEW */}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-600 dark:text-gray-400 mb-1">Variety:</p>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 wrap-break-word">
                        {validationResult.variety_name}
                      </p>
                      {validationResult.is_new_variety && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          <Plus size={10} className="mr-1" />
                          New
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-gray-600 dark:text-gray-400 mb-1">Quantity:</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {validationResult.sale_data.quantity} {validationResult.measurement_unit}
                    </p>
                  </div>


                  <div>
                    <p className="text-gray-600 dark:text-gray-400 mb-1">Payment:</p>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${validationResult.sale_data.payment_status === 'paid'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                      }`}>
                      {validationResult.sale_data.payment_status === 'paid' ? (
                        <>
                          <Wallet size={12} className="mr-1" />
                          Paid
                        </>
                      ) : (
                        <>
                          <CreditCard size={12} className="mr-1" />
                          Loan
                        </>
                      )}
                    </span>
                  </div>

                  {validationResult.sale_data.customer_name && (
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 mb-1">Customer:</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100 wrap-break-word">
                        {validationResult.sale_data.customer_name}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-gray-600 dark:text-gray-400 mb-1">Total Cost:</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      ₹{validationResult.sale_data.cost_price}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-600 dark:text-gray-400 mb-1">Total Selling:</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      ₹{validationResult.sale_data.selling_price}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-600 dark:text-gray-400 mb-1">Expected Profit:</p>
                    <p className="font-semibold text-green-600 dark:text-green-400">
                      ₹{(validationResult.sale_data.selling_price - validationResult.sale_data.cost_price).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* AUTO-CREATION INFO (like SaleForm) */}
                {validationResult.is_new_variety && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Plus className="text-blue-600 dark:text-blue-400 mt-0.5" size={18} />
                      <div>
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                          Creating New Variety
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          "{validationResult.variety_name}" will be created automatically with default settings.
                          Inventory will also be auto-created. You can update details later.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-6">
                  <button
                    onClick={confirmAndSubmit}
                    disabled={isProcessing}
                    className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-green-600 dark:bg-green-700 text-white rounded-lg text-sm sm:text-base font-medium hover:bg-green-700 dark:hover:bg-green-800 transition disabled:opacity-50 active:scale-95"
                  >
                    ✓ Confirm & Record Sale
                  </button>
                  <button
                    onClick={cancelValidation}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm sm:text-base font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

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
    </div>
  );
};

export default VoiceSalesComponent;
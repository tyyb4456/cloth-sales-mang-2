// frontend/src/components/VoiceSalesComponent.jsx - UPDATED WITH STOCK TYPE & PAYMENT STATUS

import { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Trash2, Loader, AlertCircle, CheckCircle, 
  Volume2, StopCircle, Package, DollarSign, TrendingUp,
  Calendar, CreditCard, Wallet, ShoppingBag, Info
} from 'lucide-react';
import api from '../api/api';

// Helper functions
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
      setSuccessMessage('Sale deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting sale:', error);
      setError('Failed to delete sale');
    }
  };

  // Voice recording functions
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
      // Step 1: Transcribe audio
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const transcribeResponse = await api.post('/sales/voice/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const transcribeData = transcribeResponse.data;
      setTranscript(transcribeData.transcript);

      // Step 2: Validate with AI (structured output)
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
      // Use new endpoint that handles stock deduction & tenant isolation
      const response = await api.post('/sales/voice/record-sale', validationResult.sale_data);

      setSuccessMessage(`Voice sale recorded successfully! ${response.data.stock_deducted ? '(Stock deducted)' : ''} 🎉`);
      setTranscript('');
      setValidationResult(null);
      loadSales();
      
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Voice Command Sales</h2>
            <p className="text-gray-600 mt-1">Record sales naturally using your voice</p>
          </div>
          
          <div className="flex gap-3 items-start">
            <button
              onClick={() => setShowExamples(!showExamples)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition"
            >
              <Info size={18} />
              <span className="text-sm font-medium">Examples</span>
            </button>
            
            <div className="flex items-center gap-3 bg-white border border-gray-300 rounded-lg px-4 py-2">
              <Calendar size={18} className="text-gray-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-gray-800 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Examples Panel */}
        {showExamples && examples && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-bold text-blue-900 mb-4">Voice Command Examples</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-blue-800 mb-2">Basic Sales</h4>
                <ul className="space-y-2">
                  {examples.basic_examples.map((ex, i) => (
                    <li key={i} className="text-sm text-gray-700 bg-white p-3 rounded-lg border border-blue-100">
                      "{ex}"
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-blue-800 mb-2">New Stock Sales</h4>
                <ul className="space-y-2">
                  {examples.new_stock_examples.map((ex, i) => (
                    <li key={i} className="text-sm text-gray-700 bg-white p-3 rounded-lg border border-blue-100">
                      "{ex}"
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-blue-800 mb-2">Loan/Credit Sales</h4>
                <ul className="space-y-2">
                  {examples.loan_examples.map((ex, i) => (
                    <li key={i} className="text-sm text-gray-700 bg-white p-3 rounded-lg border border-blue-100">
                      "{ex}"
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-blue-800 mb-2">Tips</h4>
                <ul className="space-y-2">
                  {examples.tips.map((tip, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="text-green-600" size={20} />
            <p className="text-green-800 font-medium">{successMessage}</p>
          </div>
        )}

        {/* Voice Command Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Voice Command</h3>
            <p className="text-gray-600 text-sm">
              Click the microphone and speak naturally. AI will extract all details automatically.
            </p>
          </div>

          {/* Recording Button */}
          <div className="flex justify-center mb-6">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                  : 'bg-blue-500 hover:bg-blue-600 hover:scale-105'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer shadow-lg'}`}
            >
              {isProcessing ? (
                <Loader className="text-white animate-spin" size={48} />
              ) : isRecording ? (
                <div className="flex flex-col items-center">
                  <StopCircle className="text-white" size={48} />
                  <span className="text-white text-xs mt-2 font-medium">Stop</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Mic className="text-white" size={48} />
                  <span className="text-white text-xs mt-2 font-medium">Start</span>
                </div>
              )}
            </button>
          </div>

          {/* Status Messages */}
          {isRecording && (
            <div className="text-center mb-4">
              <p className="text-red-600 font-medium flex items-center justify-center gap-2">
                <Volume2 size={20} className="animate-pulse" />
                Listening... Speak now
              </p>
            </div>
          )}

          {isProcessing && (
            <div className="text-center mb-4">
              <p className="text-blue-600 font-medium flex items-center justify-center gap-2">
                <Loader size={20} className="animate-spin" />
                Processing with AI...
              </p>
            </div>
          )}

          {/* Transcript */}
          {transcript && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-600 font-medium mb-2">Transcript:</p>
              <p className="text-gray-800">{transcript}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Validation Result - ENHANCED */}
          {validationResult && validationResult.success && (
            <div className="border-t border-gray-200 pt-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-4">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="text-green-600" size={24} />
                  <h4 className="text-lg font-bold text-green-800">Command Understood!</h4>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">Salesperson:</p>
                    <p className="font-semibold text-gray-900">{validationResult.sale_data.salesperson_name}</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-600 mb-1">Variety:</p>
                    <p className="font-semibold text-gray-900">{validationResult.variety_name}</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-600 mb-1">Quantity:</p>
                    <p className="font-semibold text-gray-900">
                      {validationResult.sale_data.quantity} {validationResult.measurement_unit}
                    </p>
                  </div>
                  
                  {/* Stock Type Badge */}
                  <div>
                    <p className="text-gray-600 mb-1">Stock Type:</p>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                      validationResult.sale_data.stock_type === 'new_stock'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {validationResult.sale_data.stock_type === 'new_stock' ? (
                        <>
                          <ShoppingBag size={12} className="mr-1" />
                          New Stock
                        </>
                      ) : (
                        <>
                          <Package size={12} className="mr-1" />
                          Old Stock
                        </>
                      )}
                    </span>
                  </div>
                  
                  {/* Payment Status Badge */}
                  <div>
                    <p className="text-gray-600 mb-1">Payment:</p>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                      validationResult.sale_data.payment_status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
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
                  
                  {/* Customer Name (for loans) */}
                  {validationResult.sale_data.customer_name && (
                    <div>
                      <p className="text-gray-600 mb-1">Customer:</p>
                      <p className="font-semibold text-gray-900">{validationResult.sale_data.customer_name}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-gray-600 mb-1">Total Cost:</p>
                    <p className="font-semibold text-gray-900">₹{validationResult.sale_data.cost_price}</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-600 mb-1">Total Selling:</p>
                    <p className="font-semibold text-gray-900">₹{validationResult.sale_data.selling_price}</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-600 mb-1">Expected Profit:</p>
                    <p className="font-semibold text-green-600">
                      ₹{(validationResult.sale_data.selling_price - validationResult.sale_data.cost_price).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={confirmAndSubmit}
                    disabled={isProcessing}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
                  >
                    ✓ Confirm & Record Sale
                  </button>
                  <button
                    onClick={cancelValidation}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sales Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Today's Sales</h3>
          
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader className="animate-spin text-gray-400" size={32} />
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <Package size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No sales records for this date</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Package className="text-blue-600" size={24} />
                    <p className="text-sm text-blue-600 font-medium">Items Sold</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{totalItemsSold}</p>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="text-purple-600" size={24} />
                    <p className="text-sm text-purple-600 font-medium">Total Sales</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-900">₹{totalSales.toFixed(2)}</p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="text-green-600" size={24} />
                    <p className="text-sm text-green-600 font-medium">Total Profit</p>
                  </div>
                  <p className="text-2xl font-bold text-green-900">₹{totalProfit.toFixed(2)}</p>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-lg border border-gray-200 mb-6">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50 text-gray-600 text-sm">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Salesperson</th>
                      <th className="px-4 py-3 text-left font-semibold">Variety</th>
                      <th className="px-4 py-3 text-center font-semibold">Type</th>
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
                        className={`border-t ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-800 capitalize">
                          {item.salesperson_name}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{item.variety.name}</div>
                          <div className="text-xs text-gray-500 capitalize">{item.variety.measurement_unit}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            item.stock_type === 'new_stock'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {item.stock_type === 'new_stock' ? 'New' : 'Old'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            item.payment_status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {item.payment_status === 'paid' ? 'Paid' : 'Loan'}
                          </span>
                          {item.customer_name && (
                            <div className="text-xs text-gray-600 mt-1">{item.customer_name}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-medium">
                          {formatQuantityWithUnit(item.quantity, item.variety.measurement_unit)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          ₹{(parseFloat(item.selling_price) * item.quantity).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600">
                          ₹{parseFloat(item.profit).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500 text-xs">
                          {new Date(item.sale_timestamp).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-500 hover:text-red-700 transition"
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
import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Plus, Calendar, Trash2, Loader, AlertCircle, CheckCircle, Volume2, StopCircle } from 'lucide-react';

// Helper function to format quantity with unit
const formatQuantityWithUnit = (quantity, unit) => {
  const qty = parseFloat(quantity);
  if (unit === 'meters') {
    return qty % 1 === 0 ? `${qty}m` : `${qty.toFixed(2)}m`;
  }
  if (unit === 'yards') {
    return qty % 1 === 0 ? `${qty}y` : `${qty.toFixed(2)}y`;
  }
  return Math.floor(qty);
};

// Helper function to get item count
const getItemCount = (quantity, unit) => {
  if (unit === 'meters' || unit === 'yards') return 1;
  return parseFloat(quantity);
};

// Format date to YYYY-MM-DD
const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const VoiceSalesComponent = () => {
  const [varieties, setVarieties] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  
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

  const API_BASE_URL = 'http://127.0.0.1:8000';

  useEffect(() => {
    loadVarieties();
    loadSales();
  }, [selectedDate]);

  const loadVarieties = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/varieties/`);
      const data = await response.json();
      setVarieties(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading varieties:', error);
    }
  };

  const loadSales = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/sales/date/${selectedDate}`);
      const data = await response.json();
      setSales(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this sale?')) return;
    try {
      await fetch(`${API_BASE_URL}/sales/${id}`, { method: 'DELETE' });
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
      // Step 1: Send audio to backend for Whisper transcription
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const transcribeResponse = await fetch(`${API_BASE_URL}/sales/voice/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!transcribeResponse.ok) {
        throw new Error('Failed to transcribe audio');
      }

      const transcribeData = await transcribeResponse.json();
      setTranscript(transcribeData.transcript);

      // Step 2: Send transcript to backend for AI validation and parsing
      const validateResponse = await fetch(`${API_BASE_URL}/sales/voice/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transcript: transcribeData.transcript,
          varieties: varieties 
        }),
      });

      if (!validateResponse.ok) {
        throw new Error('Failed to validate voice command');
      }

      const validationData = await validateResponse.json();
      
      if (!validationData.success) {
        setError(validationData.message || 'Failed to understand command');
        setValidationResult(null);
        return;
      }

      setValidationResult(validationData);

    } catch (err) {
      setError(err.message || 'Failed to process audio');
      console.error('Processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmAndSubmit = async () => {
    if (!validationResult || !validationResult.sale_data) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/sales/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validationResult.sale_data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to record sale');
      }

      setSuccessMessage('Sale recorded successfully via voice command! 🎉');
      setTranscript('');
      setValidationResult(null);
      loadSales();
      
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setError(err.message);
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Voice Command Sales</h2>
            <p className="text-gray-600 mt-1">Record sales using your voice</p>
          </div>
          <div className="flex gap-3 items-center">
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
              Click the microphone and speak naturally. Example: "I sell 50 meters cotton, cost price per meter is 100 rupees, selling price per meter is 150 rupees"
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
                  <span className="text-white text-xs mt-2 font-medium">Recording...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Mic className="text-white" size={48} />
                  <span className="text-white text-xs mt-2 font-medium">Click to Speak</span>
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
                Processing your voice command...
              </p>
            </div>
          )}

          {/* Transcript Display */}
          {transcript && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-600 font-medium mb-2">Transcript:</p>
              <p className="text-gray-800">{transcript}</p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Validation Result */}
          {validationResult && validationResult.success && (
            <div className="border-t border-gray-200 pt-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-4">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="text-green-600" size={24} />
                  <h4 className="text-lg font-bold text-green-800">Command Understood!</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
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
                  <div>
                    <p className="text-gray-600 mb-1">Cost Price:</p>
                    <p className="font-semibold text-gray-900">₹{validationResult.sale_data.cost_price}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Selling Price:</p>
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
              <p>No sales records for this date</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-gray-200 mb-6">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50 text-gray-600 text-sm">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Salesperson</th>
                      <th className="px-4 py-3 text-left font-semibold">Variety</th>
                      <th className="px-4 py-3 text-center font-semibold">Qty</th>
                      <th className="px-4 py-3 text-right font-semibold">Cost/Unit</th>
                      <th className="px-4 py-3 text-right font-semibold">Price/Unit</th>
                      <th className="px-4 py-3 text-right font-semibold">Total Profit</th>
                      <th className="px-4 py-3 text-right font-semibold">Total Sale</th>
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
                        <td className="px-4 py-3 font-medium text-gray-800">{item.salesperson_name}</td>
                        <td className="px-4 py-3">
                          <div>{item.variety.name}</div>
                          <div className="text-xs text-gray-500 capitalize">{item.variety.measurement_unit}</div>
                        </td>
                        <td className="px-4 py-3 text-center font-medium">
                          {formatQuantityWithUnit(item.quantity, item.variety.measurement_unit)}
                        </td>
                        <td className="px-4 py-3 text-right">₹{parseFloat(item.cost_price).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">₹{parseFloat(item.selling_price).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600">
                          ₹{parseFloat(item.profit).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          ₹{(parseFloat(item.selling_price) * item.quantity).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500">
                          {new Date(item.sale_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-500 hover:text-red-700 transition"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                <div className="text-center md:text-left">
                  <p className="text-sm text-gray-600 mb-1">Items Sold</p>
                  <p className="text-2xl font-bold text-gray-800">{totalItemsSold}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Total Sales</p>
                  <p className="text-2xl font-bold text-gray-800">₹{totalSales.toFixed(2)}</p>
                </div>
                <div className="text-center md:text-right">
                  <p className="text-sm text-gray-600 mb-1">Total Profit</p>
                  <p className="text-2xl font-bold text-green-600">₹{totalProfit.toFixed(2)}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceSalesComponent;
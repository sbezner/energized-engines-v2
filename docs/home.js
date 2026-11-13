// Model finder functionality
(function() {
  'use strict';
  
  const BASE_PATH = window.EEConfig?.BASE_PATH || '';
  
  const seriesModels = {
    '2000': ['2000', '2010', '2012S', '2015', '2016S', '2020', '2025'],
    '2100': ['2100', '2112', '2118', '2124'],
    '2400': ['2400', '2412', '2416'],
    'roust-a-bout': ['Roust-A-Bout', 'R-100', 'R-150', 'R-180', 'R-250'],
    'eventer': ['EVENTER 16', 'EVENTER 20', 'EVENTER 25'],
    'gantry': ['Gantry', 'GH2T']
  };
  
  document.addEventListener('DOMContentLoaded', function() {
    const seriesSelect = document.getElementById('seriesSelect');
    const modelSelect = document.getElementById('modelSelect');
    const showPartsBtn = document.getElementById('showPartsBtn');
    
    if (!seriesSelect || !modelSelect || !showPartsBtn) return;
    
    seriesSelect.addEventListener('change', function() {
      const series = this.value;
      
      // Reset model select
      modelSelect.innerHTML = '<option value="">Select model</option>';
      modelSelect.disabled = !series;
      showPartsBtn.disabled = true;
      
      if (series && seriesModels[series]) {
        seriesModels[series].forEach(model => {
          const option = document.createElement('option');
          option.value = model;
          option.textContent = model;
          modelSelect.appendChild(option);
        });
        modelSelect.disabled = false;
      }
    });
    
    modelSelect.addEventListener('change', function() {
      showPartsBtn.disabled = !this.value;
    });
    
    showPartsBtn.addEventListener('click', function() {
      const model = modelSelect.value;
      if (model) {
        window.location.href = `${BASE_PATH}/search.html?q=${encodeURIComponent(model)}`;
      }
    });
  });
})();

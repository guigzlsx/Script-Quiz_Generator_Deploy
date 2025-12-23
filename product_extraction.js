document.addEventListener('DOMContentLoaded', function(){
  const fileInput = document.getElementById('fileInput');
  const dropArea = document.getElementById('dropArea');
  const fileHint = document.getElementById('fileHint');
  const generateBtn = document.getElementById('generateBtn');
  const loading = document.getElementById('loading');
  const outputJson = document.getElementById('outputJson');
  const downloadBtn = document.getElementById('downloadBtn');
  const extraInfo = document.getElementById('extraInfo');
  const previewData = document.getElementById('previewData');
  const productTypeSelector = document.getElementById('productType');
  const templateInfo = document.getElementById('templateInfo');
  const fieldCount = document.getElementById('fieldCount');
  const sectionCount = document.getElementById('sectionCount');

  // Safety check
  if (!dropArea || !fileInput || !generateBtn || !productTypeSelector) {
    console.error('Éléments DOM manquants. Vérifiez le HTML.');
    return;
  }

  let lastResult = null;

  // Configuration des templates par type de produit
  const productConfigs = {
    smartphone: {
      template: 'templates/smartphone_template.json',
      prompt: 'templates/smartphone_prompt.txt',
      fields: 800,
      sections: 18,
      name: 'Smartphone'
    },
    audio: {
      template: 'templates/audio_template.json',
      prompt: 'templates/audio_prompt.txt',
      fields: 300,
      sections: 10,
      name: 'Audio'
    },
    tv: {
      template: 'templates/tv_template.json',
      prompt: 'templates/tv_prompt.txt',
      fields: 400,
      sections: 12,
      name: 'Télévision'
    },
    casques: {
      template: 'templates/casques_template.json',
      prompt: 'templates/casques_prompt.txt',
      fields: 330,
      sections: 11,
      name: 'Casque'
    },
    friteuse: {
      template: 'templates/friteuse_template.json',
      prompt: 'templates/friteuse_prompt.txt',
      fields: 180,
      sections: 13,
      name: 'Friteuse'
    }
    // Ajouter d'autres types ici
  };

  // Mettre à jour les stats selon le type sélectionné
  function updateStats() {
    const selectedType = productTypeSelector.value;
    const config = productConfigs[selectedType];
    
    if (config) {
      templateInfo.textContent = `Template ${config.name}`;
      fieldCount.textContent = `+${config.fields}`;
      sectionCount.textContent = config.sections;
    }
  }

  // Écouter le changement de type de produit
  productTypeSelector.addEventListener('change', updateStats);

  // Initialiser les stats
  updateStats();


  // Fonction pour générer la prévisualisation structurée COMPLÈTE
  function renderPreview(data) {
    if (!data || !data.normalized) {
      previewData.innerHTML = '<p style="color:var(--muted);">Aucune donnée à afficher</p>';
      return;
    }

    const normalized = data.normalized.normalized || data.normalized;
    const selectedType = productTypeSelector.value;
    let html = '';

    // Helper pour afficher une valeur
    const formatValue = (val) => {
      if (val === null || val === undefined) return '<span class="null">Non renseigné</span>';
      if (typeof val === 'boolean') return val ? 'Oui' : 'Non';
      if (Array.isArray(val)) return val.length ? val.join(', ') : '<span class="null">Vide</span>';
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    };

    // Helper pour extraire la valeur depuis un objet {value, raw, confidence}
    const getValue = (obj) => {
      if (!obj) return null;
      if (obj.value !== undefined) return obj.value;
      return obj;
    };

    // Helper pour afficher un champ seulement si non-null
    const renderField = (label, obj) => {
      const val = getValue(obj);
      if (val === null || val === undefined) return '';
      return `<div class="data-field"><span class="label">${label}</span><span class="value">${formatValue(val)}</span></div>`;
    };

    // Fallback générique pour les types non-smartphone (ex: friteuse)
    const isLeaf = (node) => {
      if (node === null || node === undefined) return true;
      if (typeof node !== 'object' || Array.isArray(node)) return true;
      if (Object.prototype.hasOwnProperty.call(node, 'value')) return true;
      if (Object.prototype.hasOwnProperty.call(node, 'raw')) return true;
      if (Object.prototype.hasOwnProperty.call(node, 'id')) return true;
      if (Object.prototype.hasOwnProperty.call(node, 'type')) return true;
      return false;
    };

    const renderGenericSection = (title, obj) => {
      let inner = '';
      for (const key of Object.keys(obj)) {
        const v = obj[key];
        if (isLeaf(v)) {
          const val = getValue(v);
          if (val !== null && val !== undefined && String(val).trim() !== '') {
            inner += renderField(key, v);
          }
        } else if (typeof v === 'object' && v !== null) {
          const nested = renderGenericSection(key, v);
          if (nested) inner += nested;
        }
      }
      if (!inner) return '';
      return `<div class="data-section"><h5>${title}</h5>${inner}</div>`;
    };

    if (selectedType !== 'smartphone') {
      let genericHtml = '';
      for (const sectionName of Object.keys(normalized)) {
        const section = normalized[sectionName];
        if (section && typeof section === 'object') {
          const secHtml = renderGenericSection(sectionName, section);
          if (secHtml) genericHtml += secHtml;
        }
      }
      previewData.innerHTML = genericHtml || '<p style="color:var(--muted);">Aucune donnée à afficher</p>';
      return;
    }

    // Fallback générique pour tous les autres types (audio, tv, casques, etc.)
    if (selectedType !== 'smartphone' && selectedType !== 'friteuse') {
      let genericHtml = '';
      for (const sectionName of Object.keys(normalized)) {
        const section = normalized[sectionName];
        if (section && typeof section === 'object') {
          const secHtml = renderGenericSection(sectionName, section);
          if (secHtml) genericHtml += secHtml;
        }
      }
      previewData.innerHTML = genericHtml || '<p style="color:var(--muted);">Aucune donnée à afficher</p>';
      return;
    }

    // Section Général (smartphone)
    if (normalized.general) {
      html += '<div class="data-section"><h5>🔧 Général</h5>';
      const g = normalized.general;
      html += renderField('Langue', g.langue);
      html += renderField('EAN', g.ean);
      html += renderField('Marque', g.brand);
      html += renderField('Produit', g.product_name);
      html += renderField('OS Version', g.os_version);
      if (g.dimensions) {
        const d = g.dimensions;
        const w = getValue(d.width_mm);
        const h = getValue(d.height_mm);
        const t = getValue(d.thickness_mm);
        const wf = getValue(d.width_folded_mm);
        const hf = getValue(d.height_folded_mm);
        const tf = getValue(d.thickness_folded_mm);
        if (w) html += renderField('Largeur', { value: w + ' mm' });
        if (wf) html += renderField('Largeur (plié)', { value: wf + ' mm' });
        if (h) html += renderField('Hauteur', { value: h + ' mm' });
        if (hf) html += renderField('Hauteur (plié)', { value: hf + ' mm' });
        if (t) html += renderField('Épaisseur', { value: t + ' mm' });
        if (tf) html += renderField('Épaisseur (plié)', { value: tf + ' mm' });
      }
      const weight = getValue(g.weight_g);
      if (weight) html += renderField('Poids', { value: weight + ' g' });
      html += renderField('Type SIM', g.sim_card_type);
      html += renderField('Double SIM', g.dual_sim);
      html += renderField('Support eSIM', g.esim_support);
      html += renderField('SIM + eSIM', g.sim_and_esim);
      html += renderField('Charge sans fil', g.wireless_charging);
      html += renderField('Indice IP', g.ip_rating);
      html += renderField('Indice réparabilité', g.repairability_index);
      html += renderField('Lecteur empreintes', g.fingerprint_reader);
      html += renderField('Reconnaissance faciale', g.face_recognition);
      html += renderField('Finition design', g.design_finish);
      html += renderField('Service client', g.customer_service);
      html += renderField('Ne contient pas', g.does_not_contain);
      html += renderField('Période garantie', g.warranty_period);
      html += '</div>';
    }

    // Section Performance
    if (normalized.performance) {
      html += '<div class="data-section"><h5>⚡ Performance</h5>';
      const p = normalized.performance;
      html += renderField('Famille CPU', p.cpu_family);
      html += renderField('Modèle CPU', p.cpu_model);
      html += renderField('Cœurs CPU', p.cpu_cores_total);
      const freq = getValue(p.cpu_frequency_ghz);
      if (freq) html += renderField('Fréquence CPU', { value: freq + ' GHz' });
      const turbo = getValue(p.cpu_turbo_frequency_ghz);
      if (turbo) html += renderField('Turbo', { value: turbo + ' GHz' });
      html += renderField('Architecture CPU', p.cpu_architecture);
      const nm = getValue(p.manufacturing_process_nm);
      if (nm) html += renderField('Gravure', { value: nm + ' nm' });
      html += renderField('Cœurs GPU', p.gpu_cores);
      html += renderField('Type modem', p.modem_type);
      html += renderField('NPU', p.npu);
      html += renderField('Cœurs NPU', p.npu_cores);
      html += renderField('Capacités IA', p.ai_capabilities);
      html += renderField('Cœurs performance', p.performance_cores);
      html += renderField('Cœurs efficacité', p.efficiency_cores);
      html += renderField('Ray-tracing matériel', p.hardware_raytracing);
      html += '</div>';
    }

    // Section Écran
    if (normalized.display) {
      html += '<div class="data-section"><h5>📱 Écran</h5>';
      const d = normalized.display;
      const size = getValue(d.size_inches);
      if (size) html += renderField('Taille', { value: size + '"' });
      html += renderField('Résolution', d.resolution);
      html += renderField('PPI', d.ppi);
      html += renderField('Type écran', d.screen_type);
      html += renderField('Gorilla Glass', d.gorilla_glass);
      const bright = getValue(d.brightness_nits);
      if (bright) html += renderField('Luminosité', { value: bright + ' nits' });
      html += renderField('Contraste', d.contrast_ratio);
      html += renderField('Ratio', d.aspect_ratio);
      html += renderField('Tactile', d.touchscreen);
      const refresh = getValue(d.refresh_rate_hz);
      if (refresh) html += renderField('Taux rafraîchissement', { value: refresh + ' Hz' });
      html += renderField('HDR', d.hdr_support);
      html += renderField('Gamme couleurs', d.color_gamut);
      html += renderField('Profondeur couleurs (bits)', d.color_depth_bits);
      html += renderField('Filtre lumière bleue', d.blue_light_filter);
      html += renderField('Always-on display', d.always_on_display);
      html += renderField('True Tone', d.true_tone);
      html += renderField('Adaptive Sync', d.adaptive_sync);
      html += renderField('Dynamic Island', d.dynamic_island);
      html += '</div>';
    }

    // Section Mémoire
    if (normalized.memory_storage) {
      html += '<div class="data-section"><h5>💾 Mémoire & Stockage</h5>';
      const m = normalized.memory_storage;
      const ram = getValue(m.ram_gb);
      if (ram) html += renderField('RAM', { value: ram + ' GB' });
      html += renderField('Type RAM', m.ram_type);
      const ramMhz = getValue(m.ram_clock_speed_mhz);
      if (ramMhz) html += renderField('Vitesse RAM', { value: ramMhz + ' MHz' });
      const storage = getValue(m.storage_internal_gb);
      if (storage) html += renderField('Stockage', { value: storage + ' GB' });
      html += renderField('Cartes mémoire compatibles', m.compatible_memory_cards);
      const maxCard = getValue(m.max_memory_card_size_gb);
      if (maxCard) html += renderField('Extension max', { value: maxCard + ' GB' });
      html += renderField('Cloud', m.cloud_storage);
      html += '</div>';
    }

    // Section Caméra (flat schema)
    if (normalized.camera) {
      html += '<div class="data-section"><h5>📷 Caméra Arrière</h5>';
      const c = normalized.camera;
      html += renderField('Modules arrière', c.rear_modules_count);
      html += renderField('Capteur principal (MP)', c.rear_main_resolution_mp);
      html += renderField('Ouverture principale', c.rear_main_aperture);
      html += renderField('Taille capteur', c.rear_sensor_size);
      html += renderField('Taille pixel (µm)', c.rear_main_pixel_size_um);
      const focal = getValue(c.rear_main_focal_length);
      if (focal) html += renderField('Focale', { value: focal + ' mm' });
      const fov = getValue(c.rear_main_fov);
      if (fov) html += renderField('Champ vision', { value: fov + '°' });
      html += renderField('Second capteur (MP)', c.rear_second_resolution_numeric);
      html += renderField('Ouverture secondaire', c.rear_second_aperture);
      html += renderField('Troisième capteur (MP)', c.rear_third_resolution_numeric);
      html += renderField('Ouverture tertiaire', c.rear_third_aperture);
      html += renderField('Flash', c.rear_flash);
      html += renderField('Autofocus', c.rear_autofocus);
      html += renderField('Zoom optique', c.rear_optical_zoom);
      html += renderField('Zoom numérique', c.rear_digital_zoom);
      html += renderField('Stabilisation optique', c.rear_optical_stabilization);
      html += renderField('Stabilisation vidéo', c.rear_video_stabilizer);
      html += renderField('Mode nuit', c.rear_night_mode);
      html += renderField('Mode portrait', c.rear_portrait_mode);
      html += renderField('Mode cinématique', c.rear_cinematic_mode);
      html += renderField('Deep Fusion', c.rear_deep_fusion);
      html += renderField('Smart HDR', c.rear_smart_hdr);
      html += renderField('Macro photo', c.rear_macro_photo);
      html += renderField('Enregistrement vidéo', c.rear_video_recording);
      html += renderField('Slow motion', c.rear_slow_motion_video);
      html += renderField('Time lapse', c.rear_time_lapse);
      html += renderField('Mode rafale', c.rear_burst_mode);
      html += '</div>';

      html += '<div class="data-section"><h5>🤳 Caméra Avant</h5>';
      html += renderField('Résolution (MP)', c.front_resolution_mp);
      html += renderField('Ouverture', c.front_aperture);
      html += renderField('Taille capteur', c.front_sensor_size);
      html += renderField('Taille pixel (µm)', c.front_pixel_size_um);
      const frontFov = getValue(c.front_fov);
      if (frontFov) html += renderField('Champ vision', { value: frontFov + '°' });
      html += renderField('Flash', c.front_flash);
      html += renderField('Enregistrement vidéo', c.front_video_recording);
      html += renderField('Panorama', c.front_panorama);
      html += '</div>';
    }

    // Section Audio
    if (normalized.audio) {
      html += '<div class="data-section"><h5>🔊 Audio</h5>';
      const a = normalized.audio;
      html += renderField('Haut-parleurs', a.speakers_count);
      html += renderField('Système audio', a.audio_system);
      html += renderField('Microphones', a.microphones_count);
      html += renderField('Égaliseur', a.equalizer);
      html += renderField('Réduction bruit', a.noise_reduction);
      html += renderField('Certifications', a.certifications);
      html += '</div>';
    }

    // Section Batterie
    if (normalized.battery) {
      html += '<div class="data-section"><h5>🔋 Batterie</h5>';
      const b = normalized.battery;
      const cap = getValue(b.capacity_mah);
      if (cap) html += renderField('Capacité', { value: cap + ' mAh' });
      html += renderField('Type', b.type);
      html += renderField('Amovible', b.removable);
      html += renderField('Type charge', b.charging_type);
      html += renderField('Charge rapide', b.fast_charge);
      const fastW = getValue(b.fast_charge_watt);
      if (fastW) html += renderField('Puissance charge rapide', { value: fastW + ' W' });
      const time = getValue(b.recharge_time_minutes);
      if (time) html += renderField('Temps recharge', { value: time + ' min' });
      const videoH = getValue(b.video_playback_hours);
      if (videoH) html += renderField('Lecture vidéo', { value: videoH + ' h' });
      const audioH = getValue(b.audio_playback_hours);
      if (audioH) html += renderField('Lecture audio', { value: audioH + ' h' });
      const talkH = getValue(b.talk_time_hours);
      if (talkH) html += renderField('Conversation', { value: talkH + ' h' });
      const standbyH = getValue(b.standby_hours);
      if (standbyH) html += renderField('Veille', { value: standbyH + ' h' });
      html += renderField('Partage énergie sans fil', b.wireless_power_sharing);
      html += '</div>';
    }

    // Section Réseau
    if (normalized.network) {
      html += '<div class="data-section"><h5>📡 Réseau</h5>';
      const n = normalized.network;
      html += renderField('Génération réseau', n.mobile_network_generation);
      html += renderField('5G', n.has_5g);
      html += renderField('Bandes 5G', n.compatible_5g_bands);
      html += renderField('VoLTE', n.volte_compatible);
      html += renderField('Wi-Fi', n.wifi);
      const wifiStd = getValue(n.wifi_standard);
      if (wifiStd) html += renderField('Standard Wi-Fi', { value: wifiStd });
      const wifiBands = getValue(n.wifi_bands);
      if (wifiBands) html += renderField('Bandes Wi-Fi', { value: wifiBands });
      const wifiFreq = getValue(n.wifi_frequencies);
      if (wifiFreq) html += renderField('Fréquences Wi-Fi', { value: wifiFreq });
      html += renderField('Bluetooth', n.bluetooth);
      html += renderField('Version Bluetooth', n.bluetooth_version);
      html += renderField('Bluetooth LE', n.bluetooth_le);
      html += renderField('NFC', n.nfc);
      const sarHead = getValue(n.sar_head_eu);
      if (sarHead) html += renderField('DAS tête (UE)', { value: sarHead + ' W/kg' });
      const sarBody = getValue(n.sar_body_eu);
      if (sarBody) html += renderField('DAS tronc (UE)', { value: sarBody + ' W/kg' });
      const sarLimb = getValue(n.sar_limb_eu);
      if (sarLimb) html += renderField('DAS membre (UE)', { value: sarLimb + ' W/kg' });
      const milStd = getValue(n.military_standard);
      if (milStd) html += renderField('Certification militaire', { value: milStd });
      html += '</div>';
    }

    // Section Connectivité
    if (normalized.connectivity) {
      html += '<div class="data-section"><h5>🔌 Connectivité</h5>';
      const c = normalized.connectivity;
      html += renderField('Type SIM', c.sim_card_type);
      html += renderField('SIM échangeable à chaud', c.hot_swappable_sim);
      html += renderField('Port USB', c.usb_port);
      html += renderField('Connecteur USB', c.usb_connector);
      html += renderField('Version USB', c.usb_version);
      html += renderField('USB OTG', c.usb_otg);
      html += renderField('Connexion casque', c.headset_connection);
      html += renderField('Lightning', c.lightning_connector);
      html += renderField('MHL', c.mhl);
      html += renderField('ANT+', c.ant_plus);
      html += renderField('Miracast', c.miracast);
      html += renderField('Screen Mirroring', c.screen_mirroring);
      html += renderField('Smart Connect', c.smart_connect);
      html += renderField('Appareils compatibles', c.casting_devices);
      html += renderField('DLNA', c.dlna);
      html += '</div>';
    }

    // Section Capteurs
    if (normalized.sensors) {
      html += '<div class="data-section"><h5>🎯 Capteurs</h5>';
      const s = normalized.sensors;
      html += renderField('Accéléromètre', s.accelerometer);
      html += renderField('Gyroscope', s.gyroscope);
      html += renderField('Magnétomètre', s.magnetometer);
      html += renderField('E-compass', s.e_compass);
      html += renderField('Proximité', s.proximity_sensor);
      html += renderField('Lumière ambiante', s.ambient_light_sensor);
      html += renderField('Baromètre', s.barometer);
      html += renderField('Boussole', s.compass);
      html += renderField('Capteur empreintes', s.fingerprint_sensor);
      html += renderField('Fréquence cardiaque', s.heart_rate_sensor);
      html += renderField('Podomètre', s.pedometer);
      html += renderField('Thermomètre', s.thermometer);
      html += '</div>';
    }

    // Section GPS / Navigation
    if (normalized.gps_navigation) {
      html += '<div class="data-section"><h5>📍 GPS & Navigation</h5>';
      const g = normalized.gps_navigation;
      html += renderField('GPS', g.gps);
      html += renderField('GLONASS', g.glonass);
      html += renderField('Galileo', g.galileo);
      html += renderField('BeiDou', g.beidou);
      html += renderField('QZSS', g.qzss);
      html += renderField('NavIC', g.navic);
      html += renderField('A-GPS', g.a_gps);
      const systems = getValue(g.gps_systems);
      if (systems) html += renderField('Systèmes GPS', { value: systems });
      html += '</div>';
    }

    // Section Fonctionnalités
    if (normalized.features) {
      html += '<div class="data-section"><h5>✨ Fonctionnalités</h5>';
      const f = normalized.features;
      html += renderField('Résistant eau', f.water_resistant);
      html += renderField('Résistant poussière', f.dust_resistant);
      const mil = getValue(f.mil_std_rating);
      if (mil) html += renderField('Certification MIL-STD', { value: mil });
      html += renderField('Radio FM', f.fm_radio);
      html += renderField('Infrarouge', f.infrared);
      const assistant = getValue(f.virtual_assistant);
      if (assistant) html += renderField('Assistant virtuel', { value: assistant });
      html += renderField('Mode économie énergie', f.power_saving_mode);
      html += renderField('Mode gaming', f.gaming_mode);
      html += renderField('Mode lecture', f.reading_mode);
      html += renderField('Affichage plein soleil', f.sunlight_display);
      html += renderField('Assistant virtuel', f.virtual_assistant);
      html += renderField('GPS', f.gps);
      html += renderField('GLONASS', f.glonass);
      html += renderField('BeiDou', f.beidou);
      html += renderField('Galileo', f.galileo);
      html += renderField('QZSS', f.qzss);
      html += renderField('Radio FM', f.fm_radio);
      html += renderField('IR blaster', f.ir_blaster);
      html += '</div>';
    }

    // Section Contenu boîte
    if (normalized.in_the_box) {
      html += '<div class="data-section"><h5>📦 Contenu de la boîte</h5>';
      const b = normalized.in_the_box;
      html += renderField('Chargeur inclus', b.ac_adapter);
      html += renderField('Type chargeur', b.charger_type);
      html += renderField('Câble USB', b.usb_cable);
      html += renderField('Écouteurs', b.earphones);
      html += renderField('Coque protection', b.protective_case);
      html += renderField('Protection écran', b.screen_protector);
      html += renderField('Verre protection', b.protective_glass);
      html += renderField('Guide démarrage rapide', b.quick_start_guide);
      html += renderField('Manuel utilisateur', b.user_manual);
      html += renderField('Outil éjection SIM', b.sim_ejection_tool);
      html += renderField('Carte garantie', b.warranty_card);
      html += renderField('Stylet inclus', b.stylus_included);
      html += '</div>';
    }

    // Section Puissance
    if (normalized.power) {
      html += '<div class="data-section"><h5>⚡ Puissance</h5>';
      const p = normalized.power;
      html += renderField('Port USB-C charge', p.usb_c_charging_port);
      const maxW = getValue(p.max_power_required_w);
      if (maxW) html += renderField('Puissance max', { value: maxW + ' W' });
      const minW = getValue(p.min_power_required_w);
      if (minW) html += renderField('Puissance min', { value: minW + ' W' });
      html += renderField('Classe efficacité énergétique', p.energy_efficiency_class);
      html += '</div>';
    }

    // Section Design
    if (normalized.design) {
      html += '<div class="data-section"><h5>🎨 Design</h5>';
      const d = normalized.design;
      html += renderField('Couleurs', d.colors);
      html += renderField('Matériaux', d.materials);
      html += renderField('Finition', d.finish);
      html += '</div>';
    }

    // Section Logiciel
    if (normalized.software) {
      html += '<div class="data-section"><h5>💻 Logiciel</h5>';
      const s = normalized.software;
      html += renderField('Système exploitation', s.operating_system);
      html += renderField('Version OS', s.os_version);
      html += renderField('Interface personnalisée', s.custom_ui);
      html += renderField('Années mises à jour', s.updates_years);
      html += '</div>';
    }

    // Section Sécurité
    if (normalized.security) {
      html += '<div class="data-section"><h5>🔒 Sécurité</h5>';
      const s = normalized.security;
      html += renderField('Déverrouillage facial', s.face_unlock);
      html += renderField('Déverrouillage empreinte', s.fingerprint_unlock);
      html += renderField('Reconnaissance iris', s.iris_recognition);
      html += renderField('Dossier sécurisé', s.secure_folder);
      html += renderField('Plateforme Knox', s.knox_platform);
      html += renderField('ThinkShield', s.thinkshield);
      html += renderField('Moto Secure', s.moto_secure);
      const enterprise = getValue(s.enterprise_security);
      if (enterprise) html += renderField('Sécurité entreprise', { value: enterprise });
      html += '</div>';
    }

    // Section Durabilité
    if (normalized.sustainability) {
      html += '<div class="data-section"><h5>🌱 Durabilité</h5>';
      const s = normalized.sustainability;
      const percent = getValue(s.recycled_materials_percent);
      if (percent) html += renderField('Matériaux recyclés', { value: percent + '%' });
      html += renderField('Energy Star', s.energy_star);
      html += renderField('Neutre carbone', s.carbon_neutral);
      html += renderField('Certifications', s.sustainability_certifications);
      html += '</div>';
    }

    // Section Autres informations (capture toute info non-standard)
    if (normalized.autres_informations) {
      const other = normalized.autres_informations;
      const infos = getValue(other.infos_supplementaires);
      if (infos) {
        html += '<div class="data-section" style="background:linear-gradient(135deg,rgba(255,215,0,.08),rgba(255,140,0,.08));border-left:4px solid #ff9800;border-radius:6px;padding:16px;"><h5 style="color:#e68900;font-size:1.1em;">📋 Informations Complémentaires</h5>';
        html += '<div class="long-text-container">';
        html += infos.split('|').map(line => {
          const trimmed = line.trim();
          return trimmed ? `<div class="long-text-item">${trimmed}</div>` : '';
        }).join('');
        html += '</div></div>';
      }
    }

    previewData.innerHTML = html || '<p style="color:var(--muted);">Aucune donnée extraite</p>';
  }

  // Fonctions utilitaires
  function preventDefaults(e) { 
    e.preventDefault(); 
    e.stopPropagation(); 
  }

  function updateFileHint() {
    if (fileInput.files && fileInput.files.length) {
      const f = fileInput.files[0];
      fileHint.textContent = f.name + ' (' + Math.round(f.size/1024) + ' KB)';
    } else {
      fileHint.textContent = 'Aucun fichier sélectionné';
    }
  }

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files.length) {
      fileInput.files = files;
      updateFileHint();
    }
  }

  // Drag & drop
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.add('is-dragover'));
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.remove('is-dragover'));
  });

  dropArea.addEventListener('drop', handleDrop, false);

  // File input change
  fileInput.addEventListener('change', updateFileHint);

  // Generate button
  generateBtn.addEventListener('click', async () => {
    // Prepare FormData
    if ((!fileInput.files || !fileInput.files.length) && !confirm('Aucun fichier sélectionné — voulez-vous envoyer le champ texte uniquement ?')) {
      return;
    }

    const selectedType = productTypeSelector.value;
    const config = productConfigs[selectedType];

    if (!config) {
      alert('Type de produit non configuré');
      return;
    }

    const fd = new FormData();
    if (fileInput.files && fileInput.files.length) {
      fd.append('document', fileInput.files[0]);
    }
    const extra = extraInfo && extraInfo.value ? extraInfo.value.trim().slice(0, 1000) : '';
    if (extra) {
      fd.append('extraInfo', extra);
    }

    // Ajouter le type de produit pour que le backend charge le bon template
    fd.append('productType', selectedType);

    try {
      if (loading) loading.style.display = 'block';
      generateBtn.disabled = true;
      outputJson.textContent = 'Envoi en cours...';

      // Utiliser une route générique
      const resp = await fetch('/extract-product', { method: 'POST', body: fd });
      const data = await resp.json();
      
      if (loading) loading.style.display = 'none';
      generateBtn.disabled = false;

      if (!resp.ok) {
        outputJson.textContent = 'Erreur: ' + (data && data.error ? data.error : resp.statusText);
        return;
      }

      if (data && data.ok && data.normalized) {
        lastResult = data.normalized;
        outputJson.textContent = JSON.stringify(lastResult, null, 2);
        renderPreview(data);
        downloadBtn.style.display = 'inline-block';
      } else if (data && data.raw) {
        lastResult = { raw: data.raw };
        outputJson.textContent = JSON.stringify(lastResult, null, 2);
        previewData.innerHTML = '<p style="color:var(--muted);">Validation échouée - voir JSON brut</p>';
        downloadBtn.style.display = 'inline-block';
      } else {
        outputJson.textContent = 'Résultat inattendu: ' + JSON.stringify(data, null, 2);
        previewData.innerHTML = '<p style="color:var(--muted);">Format inattendu</p>';
      }

    } catch (err) {
      if (loading) loading.style.display = 'none';
      generateBtn.disabled = false;
      outputJson.textContent = 'Erreur réseau: ' + String(err);
      console.error('Erreur:', err);
    }
  });

  // Download button
  downloadBtn.addEventListener('click', () => {
    if (!lastResult) return;
    const selectedType = productTypeSelector.value;
    const blob = new Blob([JSON.stringify(lastResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedType}_extraction.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
});
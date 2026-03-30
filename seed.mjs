import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);

// Helper to format dates
const d = (str) => str; // YYYY-MM-DD
const ts = (str) => str; // YYYY-MM-DD HH:mm:ss

console.log("🌱 Seeding database...\n");

// ── 1. OWNERS (Familiares) ──────────────────────────────────────────────────
const ownersData = [
  { name: "María Fernández", phone: "+54 11 5555-1234", email: "maria.fernandez@gmail.com", address: "Av. Rivadavia 4520, Caballito, CABA", notes: "Prefiere turnos por la mañana" },
  { name: "Carlos Rodríguez", phone: "+54 11 5555-2345", email: "carlos.rod@hotmail.com", address: "Calle 7 #1230, La Plata, Buenos Aires", notes: "Paga siempre en efectivo" },
  { name: "Lucía Martínez", phone: "+54 11 5555-3456", email: "lu.martinez@gmail.com", address: "Av. Santa Fe 3200, Palermo, CABA", notes: null },
  { name: "Juan Pablo Gómez", phone: "+54 11 5555-4567", email: "jpgomez@yahoo.com.ar", address: "Mitre 850, San Isidro, Buenos Aires", notes: "Tiene 3 gatos, todos rescatados" },
  { name: "Valentina López", phone: "+54 11 5555-5678", email: "vale.lopez@gmail.com", address: "Av. Corrientes 5100, Almagro, CABA", notes: "Trabaja desde casa, flexible con horarios" },
  { name: "Diego Sánchez", phone: "+54 11 5555-6789", email: "diego.sanchez@outlook.com", address: "Belgrano 2340, Vicente López, Buenos Aires", notes: null },
  { name: "Camila Ruiz", phone: "+54 11 5555-7890", email: "cami.ruiz@gmail.com", address: "Av. Libertador 14200, Olivos, Buenos Aires", notes: "Siempre puntual" },
  { name: "Martín Díaz", phone: "+54 11 5555-8901", email: "martin.diaz@gmail.com", address: "Av. Cabildo 1800, Belgrano, CABA", notes: "Prefiere turnos después de las 17hs" },
  { name: "Sofía Moreno", phone: "+54 11 5555-9012", email: "sofi.moreno@hotmail.com", address: "Juncal 3400, Recoleta, CABA", notes: null },
  { name: "Alejandro Torres", phone: "+54 11 5555-0123", email: "ale.torres@gmail.com", address: "Av. Maipú 500, Martínez, Buenos Aires", notes: "Consulta frecuente por WhatsApp" },
  { name: "Florencia Acosta", phone: "+54 11 5555-1122", email: "flor.acosta@gmail.com", address: "Av. Callao 1200, Recoleta, CABA", notes: "Primera vez, referida por Lucía Martínez" },
  { name: "Roberto Méndez", phone: "+54 11 5555-3344", email: "roberto.mendez@yahoo.com", address: "Av. Avellaneda 3100, Flores, CABA", notes: "Tiene campo en Luján, a veces lleva los perros" },
];

const ownerIds = [];
for (const o of ownersData) {
  const [result] = await conn.execute(
    "INSERT INTO owners (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)",
    [o.name, o.phone, o.email, o.address, o.notes]
  );
  ownerIds.push(result.insertId);
  console.log(`  ✅ Familiar: ${o.name} (ID: ${result.insertId})`);
}

// ── 2. PETS (Pacientes) ─────────────────────────────────────────────────────
const petsData = [
  // María Fernández
  { ownerId: 0, name: "Rocky", species: "Perro", breed: "Labrador Retriever", birthDate: "2019-03-15", sex: "macho", color: "Dorado", weight: "32.50", patientType: "seguimiento", environment: "mixto", dietType: "balanceado", dietBrand: "Royal Canin Labrador", isNeutered: "si", behavior: "tranquilo", knownAllergies: "Alergia al pollo", lastDewormingDate: "2025-12-01", dewormingProduct: "Nexgard Spectra" },
  { ownerId: 0, name: "Luna", species: "Gato", breed: "Siamés", birthDate: "2021-07-20", sex: "hembra", color: "Crema con puntas oscuras", weight: "4.20", patientType: "seguimiento", environment: "interior", dietType: "balanceado", dietBrand: "Pro Plan Cat", isNeutered: "si", behavior: "tranquilo", lastDewormingDate: "2025-11-15", dewormingProduct: "Broadline" },
  // Carlos Rodríguez
  { ownerId: 1, name: "Thor", species: "Perro", breed: "Pastor Alemán", birthDate: "2020-01-10", sex: "macho", color: "Negro y fuego", weight: "38.00", patientType: "seguimiento", environment: "exterior", dietType: "mixta", isNeutered: "no", behavior: "nervioso", previousDiseases: "Displasia de cadera leve", lastDewormingDate: "2026-01-15", dewormingProduct: "Simparica Trio" },
  { ownerId: 1, name: "Canela", species: "Perro", breed: "Cocker Spaniel", birthDate: "2022-05-03", sex: "hembra", color: "Canela", weight: "12.80", patientType: "seguimiento", environment: "interior", dietType: "balanceado", dietBrand: "Eukanuba", isNeutered: "si", behavior: "tranquilo" },
  // Lucía Martínez
  { ownerId: 2, name: "Milo", species: "Perro", breed: "French Bulldog", birthDate: "2023-02-14", sex: "macho", color: "Atigrado", weight: "11.50", patientType: "seguimiento", environment: "interior", dietType: "balanceado", dietBrand: "Royal Canin Bulldog", isNeutered: "si", behavior: "tranquilo", knownAllergies: "Dermatitis atópica", currentMedication: "Apoquel 16mg diario" },
  // Juan Pablo Gómez
  { ownerId: 3, name: "Simba", species: "Gato", breed: "Naranja mestizo", birthDate: "2020-09-01", sex: "macho", color: "Naranja atigrado", weight: "5.80", patientType: "seguimiento", environment: "interior", dietType: "balanceado", dietBrand: "Whiskas", isNeutered: "si", behavior: "tranquilo", livesWithOtherAnimals: true, otherAnimalsDetails: "Vive con Nala y Cleo" },
  { ownerId: 3, name: "Nala", species: "Gato", breed: "Mestizo", birthDate: "2021-03-15", sex: "hembra", color: "Tricolor", weight: "3.90", patientType: "seguimiento", environment: "interior", dietType: "balanceado", isNeutered: "si", behavior: "miedoso" },
  { ownerId: 3, name: "Cleo", species: "Gato", breed: "Negro mestizo", birthDate: "2022-11-20", sex: "hembra", color: "Negro", weight: "4.10", patientType: "visita_unica", environment: "interior", dietType: "balanceado", isNeutered: "si", behavior: "tranquilo" },
  // Valentina López
  { ownerId: 4, name: "Toby", species: "Perro", breed: "Caniche Toy", birthDate: "2018-06-25", sex: "macho", color: "Blanco", weight: "4.50", patientType: "seguimiento", environment: "interior", dietType: "casera", dietNotes: "Come pollo y arroz, a veces balanceado", isNeutered: "si", behavior: "nervioso", previousSurgeries: "Extracción dental (2023)", knownAllergies: "Sensibilidad digestiva" },
  { ownerId: 4, name: "Kira", species: "Perro", breed: "Golden Retriever", birthDate: "2021-12-01", sex: "hembra", color: "Dorado", weight: "28.00", patientType: "seguimiento", environment: "mixto", dietType: "balanceado", dietBrand: "Pro Plan Large Breed", isNeutered: "si", behavior: "tranquilo" },
  // Diego Sánchez
  { ownerId: 5, name: "Max", species: "Perro", breed: "Beagle", birthDate: "2019-08-12", sex: "macho", color: "Tricolor", weight: "14.20", patientType: "seguimiento", environment: "mixto", dietType: "balanceado", dietBrand: "Eukanuba Medium", isNeutered: "si", behavior: "tranquilo", lastDewormingDate: "2026-02-01", dewormingProduct: "Nexgard" },
  // Camila Ruiz
  { ownerId: 6, name: "Lola", species: "Perro", breed: "Dachshund", birthDate: "2020-04-18", sex: "hembra", color: "Marrón", weight: "7.30", patientType: "seguimiento", environment: "interior", dietType: "balanceado", dietBrand: "Royal Canin Mini", isNeutered: "si", behavior: "tranquilo", previousDiseases: "Hernia de disco L2-L3 (tratada)" },
  { ownerId: 6, name: "Copito", species: "Conejo", breed: "Mini Lop", birthDate: "2023-08-01", sex: "macho", color: "Blanco", weight: "1.80", patientType: "visita_unica", environment: "interior", dietType: "otra", dietNotes: "Heno timothy, verduras frescas, pellets", behavior: "tranquilo" },
  // Martín Díaz
  { ownerId: 7, name: "Bruno", species: "Perro", breed: "Boxer", birthDate: "2018-11-30", sex: "macho", color: "Atigrado", weight: "30.50", patientType: "seguimiento", environment: "mixto", dietType: "balanceado", dietBrand: "Pro Plan", isNeutered: "si", behavior: "tranquilo", previousDiseases: "Tumor cutáneo benigno (extirpado 2024)", lastDewormingDate: "2026-01-20", dewormingProduct: "Simparica" },
  { ownerId: 7, name: "Mía", species: "Gato", breed: "Persa", birthDate: "2020-02-14", sex: "hembra", color: "Blanco", weight: "4.50", patientType: "seguimiento", environment: "interior", dietType: "balanceado", dietBrand: "Royal Canin Persian", isNeutered: "si", behavior: "tranquilo" },
  // Sofía Moreno
  { ownerId: 8, name: "Pipi", species: "Ave", breed: "Cacatúa ninfa", birthDate: "2022-01-01", sex: "desconocido", color: "Gris con mejillas naranjas", weight: "0.09", patientType: "visita_unica", environment: "interior", dietType: "otra", dietNotes: "Semillas mixtas, frutas y verduras", behavior: "tranquilo" },
  { ownerId: 8, name: "Coco", species: "Perro", breed: "Maltés", birthDate: "2021-09-10", sex: "macho", color: "Blanco", weight: "3.80", patientType: "seguimiento", environment: "interior", dietType: "balanceado", dietBrand: "Excellent Small", isNeutered: "si", behavior: "nervioso" },
  // Alejandro Torres
  { ownerId: 9, name: "Rex", species: "Perro", breed: "Rottweiler", birthDate: "2019-05-20", sex: "macho", color: "Negro y fuego", weight: "42.00", patientType: "seguimiento", environment: "exterior", dietType: "balanceado", dietBrand: "Pro Plan Large", isNeutered: "no", behavior: "tranquilo", lastDewormingDate: "2026-02-15", dewormingProduct: "Nexgard Spectra" },
  { ownerId: 9, name: "Nina", species: "Perro", breed: "Border Collie", birthDate: "2022-07-08", sex: "hembra", color: "Blanco y negro", weight: "18.50", patientType: "seguimiento", environment: "mixto", dietType: "balanceado", dietBrand: "Eukanuba", isNeutered: "si", behavior: "nervioso", notes: "Muy activa, necesita mucho ejercicio" },
  // Florencia Acosta
  { ownerId: 10, name: "Pelusa", species: "Gato", breed: "Angora", birthDate: "2023-04-12", sex: "hembra", color: "Blanco", weight: "3.50", patientType: "visita_unica", environment: "interior", dietType: "balanceado", dietBrand: "Purina Cat Chow", isNeutered: "no_se", behavior: "miedoso" },
  // Roberto Méndez
  { ownerId: 11, name: "Tango", species: "Perro", breed: "Dogo Argentino", birthDate: "2020-07-09", sex: "macho", color: "Blanco", weight: "45.00", patientType: "seguimiento", environment: "exterior", dietType: "mixta", dietNotes: "Balanceado + carne cruda", isNeutered: "no", behavior: "tranquilo", lastDewormingDate: "2026-03-01", dewormingProduct: "Bravecto" },
  { ownerId: 11, name: "Mora", species: "Perro", breed: "Mestizo", birthDate: "2021-01-15", sex: "hembra", color: "Negro con pecho blanco", weight: "22.00", patientType: "seguimiento", environment: "mixto", dietType: "balanceado", dietBrand: "Dog Chow", isNeutered: "si", behavior: "tranquilo" },
  { ownerId: 11, name: "Pancho", species: "Perro", breed: "Mestizo", birthDate: "2023-06-20", sex: "macho", color: "Marrón", weight: "15.00", patientType: "visita_unica", environment: "exterior", dietType: "balanceado", isNeutered: "no", behavior: "nervioso", notes: "Cachorro rescatado de la calle" },
];

const petIds = [];
for (const p of petsData) {
  const oid = ownerIds[p.ownerId];
  const [result] = await conn.execute(
    `INSERT INTO pets (ownerId, name, species, breed, birthDate, sex, color, weight, patientType, environment, dietType, dietBrand, dietNotes, isNeutered, behavior, knownAllergies, previousDiseases, previousSurgeries, currentMedication, livesWithOtherAnimals, otherAnimalsDetails, lastDewormingDate, dewormingProduct, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [oid, p.name, p.species, p.breed || null, p.birthDate || null, p.sex || "desconocido", p.color || null, p.weight || null, p.patientType || "visita_unica", p.environment || null, p.dietType || null, p.dietBrand || null, p.dietNotes || null, p.isNeutered || null, p.behavior || null, p.knownAllergies || null, p.previousDiseases || null, p.previousSurgeries || null, p.currentMedication || null, p.livesWithOtherAnimals ? 1 : null, p.otherAnimalsDetails || null, p.lastDewormingDate || null, p.dewormingProduct || null, p.notes || null]
  );
  petIds.push(result.insertId);
  console.log(`  🐾 Paciente: ${p.name} (${p.species}) → Familiar: ${ownersData[p.ownerId].name}`);
}

// ── 3. VISITS (Historial clínico) ───────────────────────────────────────────
const visitsData = [
  // Rocky (pet 0, owner 0)
  { petIdx: 0, ownerIdx: 0, visitDate: "2025-06-15 10:00:00", reason: "Control anual", diagnosis: "Paciente en buen estado general. Sobrepeso leve.", treatment: "Plan de dieta: reducir ración 10%. Ejercicio diario.", medications: null, weight: "33.00", temperature: "38.5", heartRate: "90", mucosas: "rosadas", hydration: "normal", notes: "Dueña comprometida con el plan de dieta" },
  { petIdx: 0, ownerIdx: 0, visitDate: "2025-09-20 09:30:00", reason: "Vómitos y diarrea", diagnosis: "Gastroenteritis aguda, probablemente alimentaria", treatment: "Dieta blanda 48hs, hidratación oral", medications: "Metoclopramida 0.5mg/kg cada 8hs x 3 días\nOmeprazol 1mg/kg cada 24hs x 5 días", weight: "32.00", temperature: "39.1", heartRate: "100", mucosas: "rosadas", hydration: "leve", nextSteps: "Control en 3 días si no mejora", notes: "Comió huesos de pollo según la dueña" },
  { petIdx: 0, ownerIdx: 0, visitDate: "2026-01-10 11:00:00", reason: "Control semestral", diagnosis: "Buen estado general. Peso controlado.", treatment: "Continuar con dieta actual", weight: "31.50", temperature: "38.4", mucosas: "rosadas", hydration: "normal", dentalStatus: "regular", notes: "Sarro moderado, recomendar limpieza dental" },
  // Luna (pet 1, owner 0)
  { petIdx: 1, ownerIdx: 0, visitDate: "2025-08-05 14:00:00", reason: "Estornudos frecuentes", diagnosis: "Rinitis leve, posible alergia ambiental", treatment: "Limpieza nasal con solución fisiológica", medications: "Cetirizina 5mg cada 24hs x 7 días", weight: "4.30", temperature: "38.8", mucosas: "rosadas", notes: "Mejoró con el tratamiento" },
  // Thor (pet 2, owner 1)
  { petIdx: 2, ownerIdx: 1, visitDate: "2025-07-12 16:00:00", reason: "Cojera miembro posterior derecho", diagnosis: "Reagudización de displasia de cadera", treatment: "Reposo relativo 2 semanas, fisioterapia", medications: "Meloxicam 0.1mg/kg cada 24hs x 10 días\nCondroprotector (glucosamina + condroitina) permanente", weight: "38.50", temperature: "38.6", heartRate: "95", notes: "Recomendar radiografía de control" },
  { petIdx: 2, ownerIdx: 1, visitDate: "2026-02-20 10:30:00", reason: "Control displasia", diagnosis: "Estable. Buena respuesta al condroprotector.", treatment: "Continuar condroprotector. Ejercicio moderado.", weight: "37.80", temperature: "38.5", mucosas: "rosadas", hydration: "normal", lymphNodes: "normal" },
  // Milo (pet 4, owner 2)
  { petIdx: 4, ownerIdx: 2, visitDate: "2025-10-01 09:00:00", reason: "Brote de dermatitis", diagnosis: "Dermatitis atópica - brote moderado", treatment: "Baño medicado con clorhexidina 2x/semana", medications: "Apoquel 16mg cada 12hs x 14 días (luego cada 24hs)\nShampoo Allermyl", weight: "11.80", temperature: "38.7", mucosas: "rosadas", notes: "Revisar alimentación, posible componente alimentario" },
  { petIdx: 4, ownerIdx: 2, visitDate: "2026-03-15 11:00:00", reason: "Control dermatitis", diagnosis: "Dermatitis controlada con Apoquel", treatment: "Mantener Apoquel 16mg diario", weight: "11.50", temperature: "38.5", mucosas: "rosadas", hydration: "normal", dentalStatus: "bueno", nextSteps: "Próximo control en 3 meses" },
  // Simba (pet 5, owner 3)
  { petIdx: 5, ownerIdx: 3, visitDate: "2025-11-10 15:00:00", reason: "Pérdida de peso", diagnosis: "Hipertiroidismo felino", treatment: "Iniciar tratamiento con Metimazol", medications: "Metimazol 2.5mg cada 12hs", weight: "5.20", temperature: "39.2", heartRate: "220", notes: "Solicitar T4 y hemograma de control en 3 semanas" },
  // Toby (pet 8, owner 4)
  { petIdx: 8, ownerIdx: 4, visitDate: "2025-05-20 10:00:00", reason: "Mal aliento y dificultad para comer", diagnosis: "Enfermedad periodontal grado III", treatment: "Limpieza dental bajo anestesia + extracción de premolar 3 inferior", medications: "Amoxicilina-ácido clavulánico 25mg/kg cada 12hs x 7 días\nMeloxicam 0.1mg/kg cada 24hs x 5 días", weight: "4.60", temperature: "38.9", dentalStatus: "malo", nextSteps: "Control post-quirúrgico en 10 días" },
  // Lola (pet 11, owner 6)
  { petIdx: 11, ownerIdx: 6, visitDate: "2025-12-05 14:30:00", reason: "Dolor de espalda, no quiere subir escaleras", diagnosis: "Sospecha de protrusión discal L4-L5", treatment: "Reposo absoluto en jaula 4 semanas, analgesia", medications: "Prednisolona 1mg/kg cada 24hs x 5 días (luego reducir)\nGabapentina 5mg/kg cada 8hs x 14 días", weight: "7.50", temperature: "38.6", heartRate: "110", notes: "Si no mejora en 1 semana, derivar a neurólogo" },
  // Bruno (pet 13, owner 7)
  { petIdx: 13, ownerIdx: 7, visitDate: "2026-01-25 17:00:00", reason: "Bulto en flanco derecho", diagnosis: "Lipoma subcutáneo benigno (confirmado por citología)", treatment: "Observación. No requiere cirugía por el momento.", weight: "31.00", temperature: "38.5", mucosas: "rosadas", hydration: "normal", lymphNodes: "normal", nextSteps: "Medir bulto cada 3 meses. Cirugía si crece rápido." },
  // Rex (pet 17, owner 9)
  { petIdx: 17, ownerIdx: 9, visitDate: "2025-08-30 09:00:00", reason: "Herida en pata por alambre", diagnosis: "Herida cortante superficial en almohadilla plantar", treatment: "Limpieza, sutura con 3 puntos, vendaje", medications: "Cefalexina 30mg/kg cada 12hs x 7 días\nTramadol 3mg/kg cada 8hs x 3 días", weight: "42.50", temperature: "38.8", notes: "Retirar puntos en 10 días. Evitar paseos en superficies ásperas." },
  // Pelusa (pet 19, owner 10)
  { petIdx: 19, ownerIdx: 10, visitDate: "2026-03-20 10:00:00", reason: "Primera consulta - chequeo general", diagnosis: "Gatita sana, buen estado general", treatment: "Plan de vacunación y desparasitación", medications: null, weight: "3.50", temperature: "38.6", mucosas: "rosadas", hydration: "normal", dentalStatus: "bueno", nextSteps: "Vacuna triple felina en 2 semanas. Evaluar castración.", notes: "Gata rescatada, aproximadamente 3 años" },
  // Tango (pet 20, owner 11)
  { petIdx: 20, ownerIdx: 11, visitDate: "2026-02-10 16:00:00", reason: "Otitis bilateral", diagnosis: "Otitis externa bacteriana bilateral", treatment: "Limpieza ótica diaria + gotas", medications: "Otomax gotas: 5 gotas cada oído cada 12hs x 14 días", weight: "44.50", temperature: "39.0", mucosas: "rosadas", notes: "Control en 2 semanas" },
  // Pancho (pet 22, owner 11)
  { petIdx: 22, ownerIdx: 11, visitDate: "2026-03-01 11:00:00", reason: "Cachorro rescatado - primera consulta", diagnosis: "Desnutrición leve, parásitos intestinales", treatment: "Desparasitación, plan nutricional", medications: "Drontal Plus según peso\nVitaminas B complex inyectable", weight: "12.00", temperature: "38.9", mucosas: "palidas", hydration: "leve", bodyCondition: "3", nextSteps: "Control de peso en 2 semanas. Iniciar vacunación.", notes: "Cachorro de aprox 9 meses, rescatado de la calle" },
];

const visitIds = [];
for (const v of visitsData) {
  const pid = petIds[v.petIdx];
  const oid = ownerIds[v.ownerIdx];
  const [result] = await conn.execute(
    `INSERT INTO visits (petId, ownerId, visitDate, reason, diagnosis, treatment, medications, nextSteps, weight, temperature, heartRate, respRate, bodyCondition, mucosas, hydration, lymphNodes, dentalStatus, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [pid, oid, v.visitDate, v.reason, v.diagnosis || null, v.treatment || null, v.medications || null, v.nextSteps || null, v.weight || null, v.temperature || null, v.heartRate || null, v.respRate || null, v.bodyCondition || null, v.mucosas || null, v.hydration || null, v.lymphNodes || null, v.dentalStatus || null, v.notes || null]
  );
  visitIds.push(result.insertId);
  console.log(`  📋 Visita: ${petsData[v.petIdx].name} - ${v.reason}`);
}

// ── 4. VACCINATIONS (Vacunas) ───────────────────────────────────────────────
const vaccinationsData = [
  // Rocky
  { petIdx: 0, vaccineName: "Séxtuple canina", doseNumber: "Refuerzo anual", applicationDate: "2025-06-15", nextDoseDate: "2026-06-15", status: "aplicada", laboratory: "Nobivac" },
  { petIdx: 0, vaccineName: "Antirrábica", doseNumber: "Refuerzo anual", applicationDate: "2025-06-15", nextDoseDate: "2026-06-15", status: "aplicada", laboratory: "Rabiguard" },
  // Luna
  { petIdx: 1, vaccineName: "Triple felina", doseNumber: "Refuerzo anual", applicationDate: "2025-08-05", nextDoseDate: "2026-08-05", status: "aplicada", laboratory: "Felocell" },
  { petIdx: 1, vaccineName: "Antirrábica", doseNumber: "Refuerzo anual", applicationDate: "2025-08-05", nextDoseDate: "2026-08-05", status: "aplicada", laboratory: "Rabiguard" },
  // Thor
  { petIdx: 2, vaccineName: "Séxtuple canina", doseNumber: "Refuerzo anual", applicationDate: "2025-07-12", nextDoseDate: "2026-07-12", status: "aplicada", laboratory: "Vanguard Plus" },
  { petIdx: 2, vaccineName: "Antirrábica", doseNumber: "Refuerzo anual", applicationDate: "2025-07-12", nextDoseDate: "2026-07-12", status: "aplicada", laboratory: "Defensor" },
  // Milo
  { petIdx: 4, vaccineName: "Séxtuple canina", doseNumber: "Refuerzo anual", applicationDate: "2025-10-01", nextDoseDate: "2026-10-01", status: "aplicada", laboratory: "Nobivac" },
  // Simba
  { petIdx: 5, vaccineName: "Triple felina", doseNumber: "Refuerzo anual", applicationDate: "2025-03-01", nextDoseDate: "2026-03-01", status: "vencida", laboratory: "Felocell", notes: "VENCIDA - programar refuerzo" },
  // Toby
  { petIdx: 8, vaccineName: "Séxtuple canina", doseNumber: "Refuerzo anual", applicationDate: "2025-05-20", nextDoseDate: "2026-05-20", status: "aplicada", laboratory: "Nobivac" },
  // Max
  { petIdx: 10, vaccineName: "Séxtuple canina", doseNumber: "Refuerzo anual", applicationDate: "2026-02-01", nextDoseDate: "2027-02-01", status: "aplicada", laboratory: "Vanguard Plus" },
  { petIdx: 10, vaccineName: "Antirrábica", doseNumber: "Refuerzo anual", applicationDate: "2026-02-01", nextDoseDate: "2027-02-01", status: "aplicada", laboratory: "Rabiguard" },
  // Lola
  { petIdx: 11, vaccineName: "Séxtuple canina", doseNumber: "Refuerzo anual", applicationDate: "2025-04-10", nextDoseDate: "2026-04-10", status: "aplicada", laboratory: "Nobivac", notes: "Próxima dosis en abril 2026" },
  // Bruno
  { petIdx: 13, vaccineName: "Séxtuple canina", doseNumber: "Refuerzo anual", applicationDate: "2026-01-25", nextDoseDate: "2027-01-25", status: "aplicada", laboratory: "Vanguard Plus" },
  { petIdx: 13, vaccineName: "Antirrábica", doseNumber: "Refuerzo anual", applicationDate: "2026-01-25", nextDoseDate: "2027-01-25", status: "aplicada", laboratory: "Defensor" },
  // Rex
  { petIdx: 17, vaccineName: "Séxtuple canina", doseNumber: "Refuerzo anual", applicationDate: "2025-08-30", nextDoseDate: "2026-08-30", status: "aplicada", laboratory: "Nobivac" },
  // Pelusa - programada
  { petIdx: 19, vaccineName: "Triple felina", doseNumber: "1ra dosis", applicationDate: "2026-04-03", nextDoseDate: "2026-04-24", status: "programada", laboratory: "Felocell", notes: "Primera vacuna, programada para abril" },
  // Pancho - programada
  { petIdx: 22, vaccineName: "Séxtuple canina", doseNumber: "1ra dosis", applicationDate: "2026-03-15", nextDoseDate: "2026-04-05", status: "programada", notes: "Iniciar esquema de cachorro" },
  // Tango
  { petIdx: 20, vaccineName: "Séxtuple canina", doseNumber: "Refuerzo anual", applicationDate: "2025-09-15", nextDoseDate: "2026-09-15", status: "aplicada", laboratory: "Vanguard Plus" },
  { petIdx: 20, vaccineName: "Antirrábica", doseNumber: "Refuerzo anual", applicationDate: "2025-09-15", nextDoseDate: "2026-09-15", status: "aplicada", laboratory: "Rabiguard" },
];

for (const v of vaccinationsData) {
  const pid = petIds[v.petIdx];
  await conn.execute(
    `INSERT INTO vaccinations (petId, vaccineName, laboratory, lotNumber, doseNumber, applicationDate, nextDoseDate, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [pid, v.vaccineName, v.laboratory || null, null, v.doseNumber || null, v.applicationDate, v.nextDoseDate || null, v.status, v.notes || null]
  );
  console.log(`  💉 Vacuna: ${petsData[v.petIdx].name} - ${v.vaccineName} (${v.status})`);
}

// ── 5. APPOINTMENTS (Turnos) ────────────────────────────────────────────────
const appointmentsData = [
  // Past - completed
  { petIdx: 0, ownerIdx: 0, startTime: "2026-03-25 10:00:00", endTime: "2026-03-25 11:00:00", reason: "Control semestral Rocky", status: "completado", address: "Av. Rivadavia 4520, Caballito" },
  { petIdx: 2, ownerIdx: 1, startTime: "2026-03-26 16:00:00", endTime: "2026-03-26 17:00:00", reason: "Control displasia Thor", status: "completado", address: "Calle 7 #1230, La Plata" },
  { petIdx: 20, ownerIdx: 11, startTime: "2026-03-27 09:00:00", endTime: "2026-03-27 10:00:00", reason: "Control otitis Tango", status: "completado", address: "Av. Avellaneda 3100, Flores" },
  // Today
  { petIdx: 4, ownerIdx: 2, startTime: "2026-03-30 10:00:00", endTime: "2026-03-30 11:00:00", reason: "Control dermatitis Milo", status: "confirmado", address: "Av. Santa Fe 3200, Palermo" },
  { petIdx: 11, ownerIdx: 6, startTime: "2026-03-30 14:00:00", endTime: "2026-03-30 15:00:00", reason: "Control columna Lola", status: "confirmado", address: "Av. Libertador 14200, Olivos" },
  { petIdx: 17, ownerIdx: 9, startTime: "2026-03-30 17:00:00", endTime: "2026-03-30 18:00:00", reason: "Vacunación anual Rex", status: "pendiente", address: "Av. Maipú 500, Martínez" },
  // Future
  { petIdx: 19, ownerIdx: 10, startTime: "2026-04-03 10:00:00", endTime: "2026-04-03 11:00:00", reason: "Vacuna triple felina Pelusa (1ra dosis)", status: "confirmado", address: "Av. Callao 1200, Recoleta" },
  { petIdx: 22, ownerIdx: 11, startTime: "2026-04-05 11:00:00", endTime: "2026-04-05 12:00:00", reason: "Control peso + vacuna Pancho", status: "pendiente", address: "Av. Avellaneda 3100, Flores" },
  { petIdx: 5, ownerIdx: 3, startTime: "2026-04-07 15:00:00", endTime: "2026-04-07 16:00:00", reason: "Control T4 Simba (hipertiroidismo)", status: "pendiente", address: "Mitre 850, San Isidro" },
  { petIdx: 9, ownerIdx: 4, startTime: "2026-04-10 09:00:00", endTime: "2026-04-10 10:00:00", reason: "Vacunación anual Kira", status: "pendiente", address: "Av. Corrientes 5100, Almagro" },
  // Cancelled
  { petIdx: 14, ownerIdx: 7, startTime: "2026-03-28 18:00:00", endTime: "2026-03-28 19:00:00", reason: "Control Mía", status: "cancelado", address: "Av. Cabildo 1800, Belgrano", notes: "Cancelado por el familiar - reprogramar" },
];

for (const a of appointmentsData) {
  const pid = petIds[a.petIdx];
  const oid = ownerIds[a.ownerIdx];
  const petName = petsData[a.petIdx].name;
  const petSpecies = petsData[a.petIdx].species;
  const clientName = ownersData[a.ownerIdx].name;
  const clientPhone = ownersData[a.ownerIdx].phone;
  await conn.execute(
    `INSERT INTO appointments (petId, ownerId, clientName, clientPhone, petName, petSpecies, startTime, endTime, reason, address, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [pid, oid, clientName, clientPhone, petName, petSpecies, a.startTime, a.endTime, a.reason, a.address, a.status, a.notes || null]
  );
  console.log(`  📅 Turno: ${petName} - ${a.reason} (${a.status})`);
}

// ── 6. PAYMENTS (Pagos) ─────────────────────────────────────────────────────
const paymentsData = [
  // Paid
  { ownerIdx: 0, amount: "15000.00", method: "transferencia", status: "pagado", paidAt: "2025-06-15 12:00:00", description: "Control anual Rocky" },
  { ownerIdx: 0, amount: "18000.00", method: "efectivo", status: "pagado", paidAt: "2025-09-20 11:00:00", description: "Consulta urgencia Rocky - gastroenteritis" },
  { ownerIdx: 0, amount: "12000.00", method: "transferencia", status: "pagado", paidAt: "2025-08-05 16:00:00", description: "Consulta Luna - rinitis" },
  { ownerIdx: 1, amount: "20000.00", method: "efectivo", status: "pagado", paidAt: "2025-07-12 18:00:00", description: "Consulta Thor - displasia + radiografía" },
  { ownerIdx: 2, amount: "15000.00", method: "transferencia", status: "pagado", paidAt: "2025-10-01 11:00:00", description: "Consulta Milo - dermatitis" },
  { ownerIdx: 3, amount: "18000.00", method: "efectivo", status: "pagado", paidAt: "2025-11-10 17:00:00", description: "Consulta Simba + análisis T4" },
  { ownerIdx: 4, amount: "35000.00", method: "transferencia", status: "pagado", paidAt: "2025-05-20 14:00:00", description: "Limpieza dental Toby + extracción" },
  { ownerIdx: 6, amount: "22000.00", method: "efectivo", status: "pagado", paidAt: "2025-12-05 16:00:00", description: "Consulta urgencia Lola - columna" },
  { ownerIdx: 9, amount: "15000.00", method: "efectivo", status: "pagado", paidAt: "2025-08-30 11:00:00", description: "Consulta Rex - herida + sutura" },
  { ownerIdx: 11, amount: "12000.00", method: "transferencia", status: "pagado", paidAt: "2026-02-10 18:00:00", description: "Consulta Tango - otitis" },
  // Pending
  { ownerIdx: 0, amount: "15000.00", method: "transferencia", status: "pendiente", description: "Control semestral Rocky - enero 2026" },
  { ownerIdx: 1, amount: "15000.00", method: "efectivo", status: "pendiente", description: "Control displasia Thor - febrero 2026" },
  { ownerIdx: 2, amount: "15000.00", method: "transferencia", status: "pendiente", description: "Control dermatitis Milo - marzo 2026" },
  { ownerIdx: 7, amount: "18000.00", method: "efectivo", status: "pendiente", description: "Consulta Bruno - lipoma" },
  { ownerIdx: 10, amount: "12000.00", method: "efectivo", status: "pendiente", description: "Primera consulta Pelusa" },
  { ownerIdx: 11, amount: "15000.00", method: "efectivo", status: "pendiente", description: "Consulta Pancho - rescatado" },
  // Partial
  { ownerIdx: 9, amount: "25000.00", method: "efectivo", status: "parcial", description: "Vacunación + control Rex y Nina", notes: "Pagó $15.000, debe $10.000" },
];

for (const p of paymentsData) {
  const oid = ownerIds[p.ownerIdx];
  await conn.execute(
    `INSERT INTO payments (ownerId, amount, currency, method, status, paidAt, description, notes)
     VALUES (?, ?, 'ARS', ?, ?, ?, ?, ?)`,
    [oid, p.amount, p.method, p.status, p.paidAt || null, p.description, p.notes || null]
  );
  console.log(`  💰 Pago: ${ownersData[p.ownerIdx].name} - $${p.amount} (${p.status})`);
}

console.log("\n✅ Seed completado!");
console.log(`   ${ownerIds.length} familias`);
console.log(`   ${petIds.length} pacientes`);
console.log(`   ${visitIds.length} visitas`);
console.log(`   ${vaccinationsData.length} vacunas`);
console.log(`   ${appointmentsData.length} turnos`);
console.log(`   ${paymentsData.length} pagos`);

await conn.end();

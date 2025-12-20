import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SQLite from 'expo-sqlite';
import React, { useEffect, useState } from 'react';
import {
    Alert, SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet, Text,
    TextInput, TouchableOpacity,
    View
} from 'react-native';

// --- CONFIGURAÇÃO DO BANCO ---
// Usando openDatabaseSync (compatível com Expo SDK 51+)
const db = SQLite.openDatabaseSync('diet_pro_v2.db');

// --- TEMA (Dark/Neon) ---
const COLORS = {
  bg: '#121212',
  card: '#1E1E1E',
  primary: '#00ff9d',    // Verde Neon
  secondary: '#00d2ff',  // Azul Neon
  text: '#ffffff',
  textDim: '#a0a0a0',
  danger: '#ff4757',
};

// --- BANCO DE DADOS DE ALIMENTOS (SIMULADO PARA LÓGICA RÁPIDA) ---
// Em um app real, isso viria do SQLite, mas aqui garante performance instantânea no cálculo.
const MEAL_OPTIONS = {
  breakfast: [
    { name: "Ovos Mexidos com Pão", foods: ["Ovos", "Pão Integral", "Café s/ açúcar"] },
    { name: "Mingau de Aveia", foods: ["Aveia", "Whey Protein", "Banana"] },
    { name: "Crepioca", foods: ["Goma de Tapioca", "Ovos", "Requeijão Light"] },
    { name: "Iogurte Turbinado", foods: ["Iogurte Natural", "Granola", "Mel"] },
  ],
  snack: [
    { name: "Fruta + Fibras", foods: ["Maçã", "Castanhas do Pará"] },
    { name: "Shake Proteico", foods: ["Whey Protein", "Água/Leite", "Morango"] },
    { name: "Sanduíche Natural", foods: ["Pão de Forma", "Atum", "Alface"] },
  ],
  main: [ // Almoço/Jantar
    { name: "O Clássico Brasileiro", foods: ["Arroz Branco", "Feijão Carioca", "Peito de Frango"] },
    { name: "Fit Low Carb", foods: ["Purê de Abóbora", "Carne Moída (Patinho)", "Brócolis"] },
    { name: "Massa Integral", foods: ["Macarrão Integral", "Molho de Tomate", "Carne Moída"] },
    { name: "Peixe Grelhado", foods: ["Tilápia Grelhada", "Batata Doce", "Salada Verde"] },
  ]
};

export default function App() {
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  // Inputs
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male'); 
  const [goal, setGoal] = useState('lose'); 
  const [activity, setActivity] = useState(1.2); 

  // Resultados
  const [dietPlan, setDietPlan] = useState(null);

  useEffect(() => {
    initDB();
  }, []);

  const initDB = () => {
    try {
      db.execSync(
        `CREATE TABLE IF NOT EXISTS profiles (
          id INTEGER PRIMARY KEY NOT NULL, 
          weight REAL, height REAL, age INTEGER, 
          gender TEXT, goal TEXT, activity REAL
        );`
      );
      
      const user = db.getFirstSync('SELECT * FROM profiles');
      if (user) {
        setWeight(String(user.weight));
        setHeight(String(user.height));
        setAge(String(user.age));
        setGender(user.gender);
        setGoal(user.goal);
        setActivity(user.activity);
        
        // Gera o plano inicial
        calculatePlan(user);
        setHasProfile(true);
      }
      setLoading(false);
    } catch (e) {
      console.error("Erro DB:", e);
      setLoading(false);
    }
  };

  const calculatePlan = (user, regenerateMenu = false) => {
    // 1. Harris-Benedict
    let tmb = (user.gender === 'male')
      ? 88.36 + (13.4 * user.weight) + (4.8 * user.height) - (5.7 * user.age)
      : 447.6 + (9.2 * user.weight) + (3.1 * user.height) - (4.3 * user.age);

    const tdee = tmb * user.activity;

    // 2. Ajuste pelo Objetivo
    let targetCalories = tdee;
    let goalTitle = "Manutenção";
    
    if (user.goal === 'lose') { targetCalories -= 500; goalTitle = "Perder Peso"; }
    else if (user.goal === 'gain') { targetCalories += 500; goalTitle = "Hipertrofia"; }

    targetCalories = Math.round(targetCalories);

    // 3. Macros
    const protein = Math.round((targetCalories * 0.30) / 4);
    const carbs = Math.round((targetCalories * 0.40) / 4);
    const fats = Math.round((targetCalories * 0.30) / 9);

    // 4. Gerar Menu com Alimentos Reais
    const menu = generateDailyMenu(targetCalories, regenerateMenu);

    setDietPlan({
      calories: targetCalories,
      macros: { protein, carbs, fats },
      goalTitle,
      water: (user.weight * 35).toFixed(0),
      menu
    });
  };

  // Função Auxiliar para escolher aleatoriamente do array
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const generateDailyMenu = (totalCal, forceNew) => {
    // Distribuição calórica
    const c = {
      cafe: Math.round(totalCal * 0.25),
      lanche: Math.round(totalCal * 0.10),
      almoco: Math.round(totalCal * 0.35),
      jantar: Math.round(totalCal * 0.30)
    };

    // Seleciona opções
    const cafe = pick(MEAL_OPTIONS.breakfast);
    const lanche = pick(MEAL_OPTIONS.snack);
    const almoco = pick(MEAL_OPTIONS.main);
    let jantar = pick(MEAL_OPTIONS.main);
    
    // Tenta não repetir almoço e jantar
    while (jantar.name === almoco.name) {
      jantar = pick(MEAL_OPTIONS.main);
    }

    // Formata a string de alimentos com quantidades estimadas
    // (Lógica simples: mais calorias = maior porção)
    const portion = totalCal > 2000 ? "Grande" : "Média";

    return [
      { time: '08:00', label: 'Café da Manhã', cal: c.cafe, title: cafe.name, items: cafe.foods.join(" + ") },
      { time: '10:30', label: 'Lanche', cal: c.lanche, title: lanche.name, items: lanche.foods.join(" + ") },
      { time: '13:00', label: 'Almoço', cal: c.almoco, title: almoco.name, items: almoco.foods.join(", ") + `\n(Porção ${portion})` },
      { time: '20:00', label: 'Jantar', cal: c.jantar, title: jantar.name, items: jantar.foods.join(", ") }
    ];
  };

  const handleSave = () => {
    if (!weight || !height || !age) return Alert.alert("Ops", "Preencha todos os campos!");

    const userData = {
      weight: parseFloat(weight), height: parseFloat(height), age: parseInt(age),
      gender, goal, activity
    };

    try {
      db.runSync('DELETE FROM profiles');
      db.runSync(
        'INSERT INTO profiles (weight, height, age, gender, goal, activity) VALUES (?, ?, ?, ?, ?, ?)',
        [userData.weight, userData.height, userData.age, userData.gender, userData.goal, userData.activity]
      );
      calculatePlan(userData);
      setHasProfile(true);
    } catch (e) {
      Alert.alert("Erro", "Não foi possível salvar.");
    }
  };

  // Função para "Sortear Novamente" o cardápio mantendo os dados
  const refreshMenu = () => {
    const userData = {
      weight: parseFloat(weight), height: parseFloat(height), age: parseInt(age),
      gender, goal, activity
    };
    calculatePlan(userData, true);
  };

  const handleReset = () => {
    db.runSync('DELETE FROM profiles');
    setHasProfile(false);
    setDietPlan(null);
    setWeight(''); setHeight(''); setAge('');
  };

  // --- COMPONENTES VISUAIS ---
  
  const SelectBtn = ({ label, selected, onPress, icon }) => (
    <TouchableOpacity onPress={onPress} style={[styles.selectBtn, selected && styles.selectBtnActive]}>
      <Ionicons name={icon} size={20} color={selected ? COLORS.bg : COLORS.textDim} />
      <Text style={[styles.selectText, selected && { color: COLORS.bg, fontWeight: 'bold' }]}>{label}</Text>
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.center}><Text style={{color: '#fff'}}>Carregando...</Text></View>;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <Text style={styles.title}>SMART<Text style={{color: COLORS.primary}}>DIET</Text></Text>
          <Text style={styles.subtitle}>Planejador Nutricional</Text>
        </View>

        {!hasProfile ? (
          // === FORMULÁRIO ===
          <View style={styles.cardForm}>
            <Text style={styles.formTitle}>Vamos calcular sua meta</Text>
            
            <View style={styles.row}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Peso (kg)</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={weight} onChangeText={setWeight} placeholder="70" placeholderTextColor="#555" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Altura (cm)</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={height} onChangeText={setHeight} placeholder="175" placeholderTextColor="#555" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Idade</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={age} onChangeText={setAge} placeholder="25" placeholderTextColor="#555" />
              </View>
            </View>

            <Text style={styles.label}>Sexo</Text>
            <View style={styles.row}>
              <SelectBtn label="Homem" icon="male" selected={gender === 'male'} onPress={() => setGender('male')} />
              <SelectBtn label="Mulher" icon="female" selected={gender === 'female'} onPress={() => setGender('female')} />
            </View>

            <Text style={styles.label}>Objetivo</Text>
            <View style={styles.row}>
              <SelectBtn label="Perder Peso" icon="trending-down" selected={goal === 'lose'} onPress={() => setGoal('lose')} />
              <SelectBtn label="Ganhar Massa" icon="barbell" selected={goal === 'gain'} onPress={() => setGoal('gain')} />
            </View>

            <Text style={styles.label}>Atividade Física</Text>
            {[{l: 'Sedentário', v: 1.2}, {l: 'Moderado (3-4x)', v: 1.55}, {l: 'Intenso (Todo dia)', v: 1.725}].map((opt) => (
               <TouchableOpacity key={opt.v} onPress={() => setActivity(opt.v)} style={[styles.activityItem, activity === opt.v && styles.activityItemActive]}>
                 <View style={[styles.radio, activity === opt.v && {borderColor: COLORS.primary, backgroundColor: COLORS.primary}]} />
                 <Text style={{color: COLORS.text}}>{opt.l}</Text>
               </TouchableOpacity>
            ))}

            <TouchableOpacity onPress={handleSave}>
              <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.btnGradient}>
                <Text style={styles.btnText}>GERAR CARDÁPIO</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          // === RESULTADO ===
          <View>
            <LinearGradient colors={[COLORS.card, '#252525']} style={styles.dashCard}>
              <View style={styles.dashHeader}>
                <Text style={{color: COLORS.textDim}}>Meta Diária</Text>
                <View style={styles.badge}><Text style={styles.badgeText}>{dietPlan.goalTitle}</Text></View>
              </View>
              
              <View style={styles.calContainer}>
                <Text style={styles.calValue}>{dietPlan.calories}</Text>
                <Text style={styles.calUnit}>Kcal</Text>
              </View>

              <View style={styles.macrosRow}>
                <MacroItem label="Proteína" value={`${dietPlan.macros.protein}g`} color={COLORS.primary} />
                <MacroItem label="Carboidrato" value={`${dietPlan.macros.carbs}g`} color={COLORS.secondary} />
                <MacroItem label="Gordura" value={`${dietPlan.macros.fats}g`} color="#ff9f43" />
              </View>
              
              <View style={styles.waterInfo}>
                <Ionicons name="water" size={18} color={COLORS.secondary} />
                <Text style={{color: COLORS.textDim, marginLeft: 8}}>Beber aprox. <Text style={{fontWeight:'bold', color: COLORS.text}}>{dietPlan.water}ml</Text> de água</Text>
              </View>
            </LinearGradient>

            <View style={styles.menuHeaderRow}>
              <Text style={styles.sectionTitle}>Cardápio Sugerido</Text>
              <TouchableOpacity onPress={refreshMenu} style={styles.refreshBtn}>
                <Ionicons name="shuffle" size={16} color={COLORS.primary} />
                <Text style={{color: COLORS.primary, fontSize: 12, fontWeight: 'bold', marginLeft: 5}}>Trocar Tudo</Text>
              </TouchableOpacity>
            </View>

            {dietPlan.menu.map((meal, i) => (
              <View key={i} style={styles.mealRow}>
                <View style={styles.timeCol}>
                  <Text style={styles.timeText}>{meal.time}</Text>
                  <View style={styles.line} />
                </View>
                <View style={styles.mealCard}>
                  <View style={styles.mealHeader}>
                    <Text style={styles.mealTitle}>{meal.title}</Text>
                    <Text style={styles.mealCal}>{meal.cal} kcal</Text>
                  </View>
                  <Text style={styles.mealItems}>{meal.items}</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
              <Text style={{color: COLORS.danger}}>Refazer Perfil</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const MacroItem = ({ label, value, color }) => (
  <View style={{ alignItems: 'center' }}>
    <Text style={{ fontSize: 18, fontWeight: 'bold', color }}>{value}</Text>
    <Text style={{ fontSize: 12, color: COLORS.textDim }}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, paddingBottom: 50 },
  
  header: { alignItems: 'center', marginBottom: 25, marginTop: 10 },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.text, letterSpacing: 1 },
  subtitle: { color: COLORS.textDim, fontSize: 14, letterSpacing: 1 },

  // Form
  cardForm: { backgroundColor: COLORS.card, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#333' },
  formTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  inputGroup: { flex: 1 },
  label: { color: COLORS.textDim, fontSize: 12, marginBottom: 8, marginLeft: 2 },
  input: { backgroundColor: '#121212', color: '#fff', borderRadius: 10, padding: 12, textAlign: 'center', fontWeight: 'bold', borderWidth: 1, borderColor: '#333' },
  
  selectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: '#121212', borderRadius: 10, gap: 8, borderWidth: 1, borderColor: '#333' },
  selectBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  selectText: { color: COLORS.textDim, fontSize: 13 },

  activityItem: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#121212', borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#333' },
  activityItemActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(0, 255, 157, 0.05)' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: COLORS.textDim, marginRight: 10 },

  btnGradient: { padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#000', fontWeight: '900', fontSize: 16 },

  // Dashboard
  dashCard: { padding: 25, borderRadius: 25, marginBottom: 25, borderWidth: 1, borderColor: '#333' },
  dashHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  badge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: COLORS.primary, fontSize: 12, fontWeight: 'bold' },
  calContainer: { alignItems: 'center', marginBottom: 20 },
  calValue: { color: COLORS.text, fontSize: 48, fontWeight: '900' },
  calUnit: { color: COLORS.textDim, fontSize: 16 },
  macrosRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, marginBottom: 20 },
  waterInfo: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 210, 255, 0.1)', padding: 10, borderRadius: 10 },

  // Menu List
  menuHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { color: COLORS.text, fontSize: 20, fontWeight: 'bold' },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,255,157,0.1)', padding: 8, borderRadius: 8 },

  mealRow: { flexDirection: 'row', marginBottom: 20 },
  timeCol: { alignItems: 'center', marginRight: 15, width: 40 },
  timeText: { color: COLORS.textDim, fontSize: 12, fontWeight: 'bold', marginBottom: 5 },
  line: { width: 1, flex: 1, backgroundColor: '#333' },
  mealCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 15, padding: 15, borderWidth: 1, borderColor: '#333' },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  mealTitle: { color: COLORS.secondary, fontWeight: 'bold', fontSize: 16 },
  mealCal: { color: COLORS.textDim, fontSize: 12 },
  mealItems: { color: COLORS.text, fontSize: 14, lineHeight: 20 },

  resetBtn: { alignSelf: 'center', padding: 20 },
});
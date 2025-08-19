import { useState, useRef, useEffect, useContext } from "react";
import "./App.css";
import FoodSelection from "./components/FoodSelections";
import FoodConfirmation from "./components/FoodConfirmation";
import Header from "./components/Header";
import Summary from "./components/Summary";
import ShowImport from "./components/ShowImport";
import Preview from "./components/Preview";
import BottomNavigation from "./components/BottomNavigation";
import QuickActions from "./components/QuickActions";
import Diary from "./components/Diary";
import CameraView from "./components/CameraView";
import UserInfo from "./components/UserInfo";
import WaterTracker from "./components/WaterTracker";
import UserContext from "./context/UserContext";

function App() {
  const { ipad, user } = useContext(UserContext);
  const ip = ipad; // for backend
  const userId = user[0];

  const [confirmMesssage, setConfirmMesssage] = useState(null);
  const [temp, setTemp] = useState([]);
  const [foodDiary, setFoodDiary] = useState([]);
  const [preview, setPreview] = useState(null);
  const [forPreview, setForPreview] = useState(null);
  const [foodList, setFoodList] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [infoPreview, setInfoPreview] = useState(false);
  const [targetCals, setTargetCals] = useState(null);
  const [waterInput, setWaterInput] = useState(false);
  const [glasses, setGlasses] = useState(0);

  const [cals, setCals] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carb, setCarb] = useState(0);

  const webcamRef = useRef(null);

  // -------------------- Effects --------------------
  useEffect(() => {
    fetch(`${ip}/food-diary/${userId}`)
      .then((res) => res.json())
      .then((data) => setFoodDiary(data))
      .catch((err) => console.error("Error fetching food diary:", err));
  }, []);

  useEffect(() => {
    const fetchTargetCalories = async () => {
      try {
        const response = await fetch(`${ip}/userdata/?userId=${userId}`);
        const data = await response.json();
        if (data[0].targetcalories) setTargetCals(data[0].targetcalories);
      } catch (error) {
        console.error("Error fetching target calories:", error);
      }
    };
    fetchTargetCalories();
  }, []);

  useEffect(() => {
    fetch(`${ip}/macros/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        setCals(data.total_cals || 0);
        setProtein(data.total_protein || 0);
        setCarb(data.total_carbs || 0);
      })
      .catch((err) => console.error("Error fetching macros:", err));
  }, []);

  // -------------------- Handlers --------------------
  const capturePhoto = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setForPreview(imageSrc);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = imageSrc;

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        const file = new File([blob], "captured_image.jpg", { type: "image/jpeg" });
        setPreview(file);
        setIsCameraOpen(false);
      }, "image/jpeg");
    };
  };

  const handleRetake = () => {
    setPreview(null);
    setIsCameraOpen(true);
  };

  const handleConfirm = async () => {
    if (!preview) return;
    try {
      const toBase64 = (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

      const base64Image = await toBase64(preview);
      const imagePrompt =
        "List the 5 most probable food items present in this image, in order from highest to lowest probability. Respond ONLY with a JSON array in this format: [{\"item\": <name>, \"probability\": <percent>}].";

      const response = await fetch(`${ip}/api/gemini/food-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64Image, imagePrompt }),
      });
      const result = await response.json();

      let items = [];
      try {
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        const match = text.match(/\[.*\]/s);
        if (match) items = JSON.parse(match[0]);
      } catch (e) {
        console.error("Error parsing Gemini response:", e);
      }

      setFoodList(items);
      setShowImportDialog(false);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image.");
    }
    setPreview(null);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== "image/jpeg") {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.src = reader.result;
        setForPreview(img.src);
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
              type: "image/jpeg",
            });
            setPreview(newFile);
          }, "image/jpeg");
        };
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(file);
      setForPreview(URL.createObjectURL(file));
    }
  };

  const handleAdd = async () => {
    const date = new Date();
    const ob = {
      userId,
      name: "Abhijeet",
      dateTime: new Date(date.getTime() + 5.5 * 60 * 60 * 1000).toISOString(),
      foodItem: temp[0],
      cals: temp[1],
      protein: temp[2],
      carbs: temp[3],
    };

    try {
      const response = await fetch(`${ip}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ob),
      });
      const data = await response.json();

      if (response.ok) {
        setCals((prev) => prev + parseInt(temp[1]));
        setProtein((prev) => prev + parseInt(temp[2]));
        setCarb((prev) => prev + parseInt(temp[3]));
        fetch(`${ip}/all/?userId=${userId}`)
          .then((res) => res.json())
          .then((data) => {
            setFoodDiary([data[data.length - 1], ...foodDiary]);
          });
        setConfirmMesssage(null);
      } else {
        alert("Error adding food!");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to add food.");
    }
  };

  const handleDiscard = () => setConfirmMesssage(null);

  const handlefoodSubmit = (event) => {
    setFoodList(null);
    let convertedStr = event.food.replace(/_/g, " ");
    const mess = `${event.quantity} ${event.unit} of ${convertedStr}`;
    const prompt = `Give the nutrition macros for ${mess} in this exact JSON format: {\n \"items\": [\n {\n \"name\": \"<food name>\",\n \"calories\": <calories>,\n \"serving_size_g\": <serving size>,\n \"fat_total_g\": <fat>,\n \"fat_saturated_g\": <saturated fat>,\n \"protein_g\": <protein>,\n \"sodium_mg\": <sodium>,\n \"potassium_mg\": <potassium>,\n \"cholesterol_mg\": <cholesterol>,\n \"carbohydrates_total_g\": <carbs>,\n \"fiber_g\": <fiber>,\n \"sugar_g\": <sugar>\n }\n ]\n}`;

    fetch(`${ip}/api/gemini/macros`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    })
      .then((res) => res.json())
      .then((data) => {
        try {
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          const match = text.match(/\{[\s\S]*\}/);
          if (!match) throw new Error("No JSON found in Gemini response");

          const macros = JSON.parse(match[0]);
          console.log(macros);
          if (!macros.items || !macros.items.length) {
            alert("Doesn't seem like anything to eat.");
            return;
          }

          const food = macros.items[0];
          setConfirmMesssage(
            `${food.serving_size_g}g of ${food.name} has ${Math.floor(
              food.calories
            )} calories and ${Math.floor(food.protein_g)}g protein and ${Math.floor(
              food.carbohydrates_total_g
            )}g carbs.\n Do you want to Add this??`
          );
          setTemp([
            food.name,
            Math.floor(food.calories),
            Math.floor(food.protein_g),
            Math.floor(food.carbohydrates_total_g),
          ]);
        } catch (e) {
          alert("Error parsing Gemini response");
          console.error(e);
        }
      })
      .catch((err) => {
        alert("Failed to get nutrition info.");
        console.error(err);
      });
  };

  // -------------------- JSX RETURN --------------------
  return (
    <div>
      {/* Header */}
      <Header setInfoPreview={setInfoPreview} />

      {/* Summary */}
      <Summary cals={cals} carb={carb} protein={protein} targetCals={targetCals || "Not set"} />

      {/* Quick Actions */}
      <QuickActions setShowImportDialog={setShowImportDialog} setWaterInput={setWaterInput} />

      {/* Import Dialog */}
      {showImportDialog && (
        <ShowImport
          preview={preview}
          setShowImportDialog={setShowImportDialog}
          setIsCameraOpen={setIsCameraOpen}
          handleFileChange={handleFileChange}
          forPreview={forPreview}
          handleRetake={handleRetake}
          handleConfirm={handleConfirm}
        />
      )}

      {/* Camera View */}
      {isCameraOpen && <CameraView capturePhoto={capturePhoto} webcamRef={webcamRef} />}

      {/* Preview */}
      {preview && <Preview handleConfirm={handleConfirm} handleRetake={handleRetake} forPreview={forPreview} />}

      {/* User Info */}
      {infoPreview && (
        <UserInfo
          userId={userId}
          setInfoPreview={setInfoPreview}
          targetCals={targetCals}
          setTargetCals={setTargetCals}
        />
      )}

      {/* Food Selection */}
      {foodList && <FoodSelection foodItems={foodList} onSubmit={handlefoodSubmit} />}

      {/* Food Confirmation */}
      {confirmMesssage && (
        <FoodConfirmation msg={confirmMesssage} onAdd={handleAdd} onDiscard={handleDiscard} />
      )}

      {/* Water Tracker */}
      {waterInput && <WaterTracker setWaterInput={setWaterInput} glasses={glasses} setGlasses={setGlasses} />}

      {/* Recent Meals */}
      <div className="mt-4">
        <h2 className="text-lg font-semibold">Recent Meals</h2>
        <Diary foodDiary={foodDiary} />
        <div className="mb-14"></div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}

export default App;

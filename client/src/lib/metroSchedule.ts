export interface MetroTiming {
  nextTrain: string;
  followingTrain: string;
  frequency: string;
  isPeakHour: boolean;
}

export function getNextMetroTimings(): MetroTiming {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  const isPeakHour = 
    (hour >= 6 && hour < 9) ||
    (hour >= 16 && hour < 19);
  
  const frequencyMinutes = isPeakHour ? 4 : 7;
  
  const nextTrainMinutes = Math.ceil((minute + 1) / frequencyMinutes) * frequencyMinutes;
  const nextTrainHour = hour + Math.floor(nextTrainMinutes / 60);
  const nextTrainMin = nextTrainMinutes % 60;
  
  const followingTrainMin = (nextTrainMin + frequencyMinutes) % 60;
  const followingTrainHour = nextTrainHour + Math.floor((nextTrainMin + frequencyMinutes) / 60);
  
  const formatTime = (h: number, m: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
    return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
  };
  
  return {
    nextTrain: formatTime(nextTrainHour, nextTrainMin),
    followingTrain: formatTime(followingTrainHour, followingTrainMin),
    frequency: isPeakHour ? 'Every 3-4 min' : 'Every 6-7 min',
    isPeakHour
  };
}

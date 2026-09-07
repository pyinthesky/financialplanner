import { runSimulation } from '../lib/stochastic';
self.onmessage=(event)=>{
 try{const result=runSimulation(event.data.plan,event.data.input,progress=>self.postMessage({progress}));self.postMessage({result});}
 catch{self.postMessage({error:'The simulation could not complete. Review the input and rule notes; no plan data was sent or logged.'});}
};

(function(root){
  "use strict";
  function create(items){
    const initialCount=items.length,answers=new Map(),shown=new Set(),skipped=new Set();
    let spoken=0;
    return {items,answers,shown,skipped,initialCount,
      grade(index,correct,answer){
        if(!items[index]||answers.has(index))return false;
        skipped.delete(index);
        answers.set(index,{correct,answer});
        if(!correct)items.push({...items[index]});
        return true;
      },
      skip(index){
        if(!items[index]||answers.has(index))return false;
        skipped.add(index);return true;
      },
      progress(index){
        const correct=[...answers.values()].filter(answer=>answer.correct).length;
        return {current:Math.min(initialCount,correct+skipped.size+(answers.get(index)?.correct||skipped.has(index)?0:1)),total:initialCount};
      },
      speak(){spoken++;},
      complete(){return initialCount>0&&answers.size+skipped.size===items.length;},
      statistics(){
        const asked=answers.size,correct=[...answers.values()].filter(a=>a.correct).length;
        return {initialCount,asked,correct,spoken,percent:asked?100*correct/asked:0,...(skipped.size?{skipped:skipped.size}:{})};
      }
    };
  }
  const api={create};root.VOCPractice=api;
  if(typeof module!=="undefined")module.exports=api;
})(typeof globalThis!=="undefined"?globalThis:this);

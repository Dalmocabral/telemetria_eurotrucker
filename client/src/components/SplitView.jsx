import React from 'react';
import SpeedometerView from './SpeedometerView';
import GpsView from './GpsView';

export default function SplitView({ data, onSendAction }) {
  return (
    <div className="split-container">
      <div className="split-left">
        <SpeedometerView data={data} onSendAction={onSendAction} isMinimal={true} />
      </div>
      <div className="split-right">
        <GpsView data={data} />
      </div>
    </div>
  );
}

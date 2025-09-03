import reducer, { setFullSequenceMode, hydrateCampaignUI, resetCampaignUI } from '../campaignUiSlice';

describe('campaignUiSlice', () => {
  it('should handle initial state', () => {
    const state = reducer(undefined, { type: '@@INIT' } as any);
    expect(state).toEqual({ byId: {} });
  });

  it('sets fullSequenceMode per campaign', () => {
    const state1 = reducer(undefined, setFullSequenceMode({ campaignId: 'c1', value: true }));
    expect(state1.byId.c1.fullSequenceMode).toBe(true);
    const state2 = reducer(state1, setFullSequenceMode({ campaignId: 'c1', value: false }));
    expect(state2.byId.c1.fullSequenceMode).toBe(false);
  });

  it('hydrates partial UI data', () => {
    const s1 = reducer(undefined, hydrateCampaignUI({ campaignId: 'c2', data: { fullSequenceMode: true } }));
    expect(s1.byId.c2.fullSequenceMode).toBe(true);
  });

  it('resets UI state per campaign', () => {
    const s1 = reducer(undefined, setFullSequenceMode({ campaignId: 'c3', value: true }));
    const s2 = reducer(s1, resetCampaignUI({ campaignId: 'c3' }));
    expect(s2.byId.c3).toBeUndefined();
  });
});
